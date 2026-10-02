from __future__ import annotations

import base64
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import Body, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.status import HTTP_303_SEE_OTHER

from . import core, crypto, export_import
from .infra.sqlite.repos import SqliteEntryRepo


def create_app(*, ctx: core.Context) -> FastAPI:
    app = FastAPI()
    base_dir = Path(__file__).resolve().parent
    templates = Jinja2Templates(directory=str(base_dir / "templates"))
    spa_dir = base_dir / "static" / "app"

    app.state.ctx = ctx
    app.state.sessions = {}
    app.mount("/static", StaticFiles(directory=str(base_dir / "static")), name="static")

    def _get_user(request: Request) -> Optional[core.AuthenticatedUser]:
        sid = request.cookies.get("sid")
        if not sid:
            return None
        return app.state.sessions.get(sid)

    def _render(request: Request, name: str, data: dict) -> HTMLResponse:
        return templates.TemplateResponse(name, {"request": request, "current_user": _get_user(request), **data})

    def _login_response(user: core.AuthenticatedUser, *, next_url: str) -> RedirectResponse:
        sid = secrets.token_urlsafe(32)
        app.state.sessions[sid] = user
        resp = RedirectResponse(url=next_url, status_code=HTTP_303_SEE_OTHER)
        resp.set_cookie("sid", sid, httponly=True, samesite="lax", max_age=30 * 24 * 3600)
        return resp

    def _require_user(request: Request) -> core.AuthenticatedUser:
        user = _get_user(request)
        if user is None:
            raise HTTPException(status_code=401, detail="not_authenticated")
        return user

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return RedirectResponse(url="/app", status_code=HTTP_303_SEE_OTHER)

    @app.get("/desk", response_class=HTMLResponse)
    async def desk(request: Request):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        latest = core.latest_entry(app.state.ctx, user=user)
        total = core.count_entries(app.state.ctx, user=user)
        entries = list(core.list_entries(app.state.ctx, user=user, limit=6))
        return _render(
            request,
            "desk.html",
            {"latest": latest, "total": total, "entries": entries, "hide_topbar": True, "body_class": "auth-force-light"},
        )

    @app.get("/app", include_in_schema=False)
    @app.get("/app/{path:path}", include_in_schema=False)
    async def spa(request: Request, path: str = ""):
        index_file = spa_dir / "index.html"
        if path:
            p = (spa_dir / path).resolve()
            if spa_dir in p.parents and p.is_file():
                return FileResponse(str(p))
        if index_file.is_file():
            return FileResponse(str(index_file))
        return HTMLResponse("SPA not built yet. Run `npm install` and `npm run build` in ./frontend.", status_code=500)

    @app.get("/api/auth/suggested-user")
    async def api_auth_suggested_user():
        conn = app.state.ctx.conn
        row = conn.execute(
            """
            SELECT u.username, u.pen_name
            FROM users u
            LEFT JOIN entries e ON u.id = e.user_id
            GROUP BY u.id
            ORDER BY MAX(e.created_at) DESC NULLS LAST, u.updated_at DESC
            LIMIT 1
            """
        ).fetchone()
        if row:
            return {"username": row[0], "pen_name": row[1]}
        return {"username": "", "pen_name": ""}

    @app.post("/api/auth/login")
    async def api_auth_login(payload: dict = Body(...)):
        username = str(payload.get("username") or "").strip()
        password = str(payload.get("password") or "")
        if not username or not password:
            raise HTTPException(status_code=400, detail="請填寫帳號與主密碼")
        try:
            user = core.authenticate_user(ctx=app.state.ctx, username=username, password=password)
        except ValueError:
            raise HTTPException(status_code=401, detail="帳號或主密碼不正確")
        sid = secrets.token_urlsafe(32)
        app.state.sessions[sid] = user
        resp = JSONResponse(content={"ok": True, "user": {"user_id": user.user_id, "username": user.username, "pen_name": user.pen_name}})
        resp.set_cookie("sid", sid, httponly=True, samesite="lax", max_age=30 * 24 * 3600)
        return resp

    @app.post("/api/auth/signup")
    async def api_auth_signup(payload: dict = Body(...)):
        username = str(payload.get("username") or "").strip()
        password = str(payload.get("password") or "")
        pen_name = str(payload.get("pen_name") or "").strip() or username
        if not username or not password:
            raise HTTPException(status_code=400, detail="請填寫帳號與主密碼")
        try:
            core.create_user(ctx=app.state.ctx, username=username, password=password, pen_name=pen_name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        user = core.authenticate_user(ctx=app.state.ctx, username=username, password=password)
        sid = secrets.token_urlsafe(32)
        app.state.sessions[sid] = user
        resp = JSONResponse(content={"ok": True, "user": {"user_id": user.user_id, "username": user.username, "pen_name": user.pen_name}})
        resp.set_cookie("sid", sid, httponly=True, samesite="lax", max_age=30 * 24 * 3600)
        return resp

    @app.post("/api/auth/logout")
    async def api_auth_logout(request: Request):
        sid = request.cookies.get("sid")
        if sid:
            app.state.sessions.pop(sid, None)
        resp = JSONResponse(content={"ok": True})
        resp.delete_cookie("sid")
        return resp

    @app.get("/api/me")
    async def api_me(request: Request):
        user = _require_user(request)
        return {"user_id": user.user_id, "username": user.username, "pen_name": user.pen_name}

    @app.get("/api/entries")
    async def api_entries(request: Request, q: str = "", limit: int = 200):
        user = _require_user(request)
        limit = max(1, min(500, int(limit)))
        if q.strip():
            items = list(core.search_entries(app.state.ctx, user=user, query=q, limit=limit))
        else:
            items = list(core.list_entries(app.state.ctx, user=user, limit=limit))
        return {"entries": [s.__dict__ for s in items]}

    @app.get("/api/entries/full")
    async def api_entries_full(request: Request, q: str = "", limit: int = 200):
        user = _require_user(request)
        limit = max(1, min(200, int(limit)))
        repo = SqliteEntryRepo(app.state.ctx.conn)
        if q.strip():
            ids = [s.id for s in core.search_entries(app.state.ctx, user=user, query=q, limit=limit)]
            rows = [repo.get_row(user_id=user.user_id, entry_id=i) for i in ids]
        else:
            rows = list(repo.list_rows(user_id=user.user_id, limit=limit))
        out = []
        for r in rows:
            content = crypto.decrypt(r.encrypted, key=user.key)
            out.append(
                {
                    "id": r.id,
                    "title": r.title,
                    "date": r.entry_date or (r.created_at[:10] if r.created_at else ""),
                    "content": content,
                    "mood": "reflective",
                    "tags": [],
                    "signature": r.signed_by_pen_name or user.pen_name,
                    "createdAt": r.created_at,
                    "updatedAt": r.updated_at,
                    "ciphertext": "AES-GCM::" + base64.b64encode(r.encrypted.ciphertext).decode("ascii"),
                    "nonce": base64.b64encode(r.encrypted.nonce).decode("ascii"),
                    "salt": "",
                }
            )
        return {"entries": out, "currentUser": {"username": user.username, "penName": user.pen_name, "isLoggedIn": True}}

    @app.post("/api/entries")
    async def api_create_entry(
        request: Request,
        payload: dict = Body(...),
    ):
        user = _require_user(request)
        title = str(payload.get("title") or "").strip() or "(untitled)"
        content = str(payload.get("content") or "")
        entry_date = payload.get("date")
        entry_id = core.create_entry(app.state.ctx, user=user, title=title, content=content, entry_date=entry_date)
        return {"entry_id": entry_id}

    @app.put("/api/entries/{entry_id}")
    async def api_update_entry(
        request: Request,
        entry_id: str,
        payload: dict = Body(...),
    ):
        user = _require_user(request)
        title = str(payload.get("title") or "").strip() or "(untitled)"
        content = str(payload.get("content") or "")
        entry_date = payload.get("date")
        core.update_entry(
            app.state.ctx,
            user=user,
            entry_id=entry_id,
            title=title,
            content=content,
            entry_date=entry_date,
        )
        return {"ok": True, "entry_id": entry_id}

    @app.delete("/api/entries/{entry_id}")
    async def api_delete_entry(request: Request, entry_id: str):
        user = _require_user(request)
        core.delete_entry(app.state.ctx, user=user, entry_id=entry_id)
        return {"ok": True}

    @app.get("/api/entries/export")
    async def api_export_entries(
        request: Request,
        format: str = "zip",
        mode: str = "encrypted",
        entry_id: Optional[str] = None,
        password: Optional[str] = None,
    ):
        user = _require_user(request)
        repo = SqliteEntryRepo(app.state.ctx.conn)
        if entry_id:
            row = repo.get_row(user_id=user.user_id, entry_id=entry_id)
            rows = [row] if row else []
        else:
            rows = list(repo.list_rows(user_id=user.user_id, limit=10_000))

        entries_data = []
        for r in rows:
            content = crypto.decrypt(r.encrypted, key=user.key)
            entries_data.append(
                {
                    "id": r.id,
                    "title": r.title,
                    "date": r.entry_date or (r.created_at[:10] if r.created_at else ""),
                    "content": content,
                    "mood": "reflective",
                    "tags": [],
                    "signature": r.signed_by_pen_name or user.pen_name,
                    "createdAt": r.created_at,
                    "updatedAt": r.updated_at,
                }
            )

        user_info = {"username": user.username, "penName": user.pen_name}
        fmt = (format or "zip").lower()
        sec_mode = (mode or "encrypted").lower()
        enc_pass = password or user.key
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d")

        if sec_mode == "encrypted":
            if fmt == "json" or fmt == "vellichor":
                if len(entries_data) == 1:
                    enc_data = export_import.encrypt_entry_data(entries_data[0], enc_pass)
                    body = json.dumps(enc_data, ensure_ascii=False, indent=2)
                    slug = export_import._sanitize_filename(entries_data[0]["title"])
                    filename = f"vellichor-{slug}-{now_str}.vellichor"
                else:
                    enc_list = [export_import.encrypt_entry_data(e, enc_pass) for e in entries_data]
                    body = json.dumps({"format": export_import.ENCRYPTED_BACKUP_TAG, "entries": enc_list}, ensure_ascii=False, indent=2)
                    filename = f"vellichor-backup-{user.username}-encrypted-{now_str}.json"
                return Response(
                    content=body,
                    media_type="application/json",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )
            else:
                zip_bytes = export_import.export_to_zip(entries_data, user_info=user_info, mode="encrypted", password=enc_pass)
                filename = f"vellichor-backup-{user.username}-encrypted-{now_str}.zip"
                return Response(
                    content=zip_bytes,
                    media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )

        # Plaintext mode
        if fmt == "json":
            body = export_import.export_to_json(entries_data, user_info=user_info)
            filename = f"vellichor-{user.username}-{now_str}.json"
            return Response(
                content=body,
                media_type="application/json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        elif fmt in ("md", "markdown"):
            body = export_import.export_to_markdown(entries_data)
            slug = export_import._sanitize_filename(entries_data[0]["title"]) if len(entries_data) == 1 else "entries"
            filename = f"vellichor-{slug}-{now_str}.md"
            return Response(
                content=body,
                media_type="text/markdown; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        else:
            zip_bytes = export_import.export_to_zip(entries_data, user_info=user_info, mode="plaintext")
            filename = f"vellichor-backup-{user.username}-{now_str}.zip"
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

    @app.post("/api/entries/import")
    async def api_import_entries(
        request: Request,
        file: Optional[UploadFile] = File(None),
        password: Optional[str] = Form(None),
    ):
        user = _require_user(request)
        dec_pass = password or user.key

        if file is not None:
            raw_bytes = await file.read()
            filename = file.filename or "import.json"
            try:
                entries = export_import.parse_import_payload(filename, raw_bytes, password=dec_pass)
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "SCHEMA_MISMATCH", "message": f"匯入失敗：檔案不符合規格（{str(e)}），系統未做任何修改。"}
                )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "IMPORT_ERROR", "message": f"匯入失敗：無法解析檔案內容（{str(e)}），系統未做任何修改。"}
                )
        else:
            try:
                body = await request.json()
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "NO_PAYLOAD", "message": "匯入失敗：未提供任何上傳檔案或 JSON 資料，系統未做任何修改。"}
                )
            if isinstance(body, dict) and "entries" in body:
                entries = body["entries"]
            elif isinstance(body, list):
                entries = body
            else:
                entries = [body] if isinstance(body, dict) else []

        if not entries:
            raise HTTPException(
                status_code=400,
                detail={"code": "SCHEMA_MISMATCH", "message": "匯入失敗：檔案未包含任何符合格式之隨筆，系統未做任何修改。"}
            )

        result = core.import_entries(app.state.ctx, user=user, entries_data=entries)
        return {"ok": True, **result}

    @app.patch("/api/me")
    async def api_update_me(request: Request, payload: dict = Body(...)):
        user = _require_user(request)
        pen_name = str(payload.get("pen_name") or "").strip()
        if not pen_name:
            raise HTTPException(status_code=400, detail="pen_name_required")
        core.update_pen_name(ctx=app.state.ctx, user_id=user.user_id, pen_name=pen_name)
        updated = core.AuthenticatedUser(user_id=user.user_id, username=user.username, pen_name=pen_name, key=user.key)
        sid = request.cookies.get("sid")
        if sid:
            app.state.sessions[sid] = updated
        return {"user_id": updated.user_id, "username": updated.username, "pen_name": updated.pen_name}

    @app.post("/api/rekey")
    async def api_rekey(request: Request, payload: dict = Body(...)):
        user = _require_user(request)
        old_password = str(payload.get("old_password") or "")
        new_password = str(payload.get("new_password") or "")
        if not old_password or not new_password:
            raise HTTPException(status_code=400, detail="password_required")
        try:
            new_key = core.rekey_user(ctx=app.state.ctx, user=user, old_password=old_password, new_password=new_password)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        updated = core.AuthenticatedUser(user_id=user.user_id, username=user.username, pen_name=user.pen_name, key=new_key)
        sid = request.cookies.get("sid")
        if sid:
            app.state.sessions[sid] = updated
        return {"ok": True}

    @app.get("/signup", response_class=HTMLResponse)
    async def signup_form(request: Request):
        return _render(
            request,
            "signup.html",
            {"error": None, "username": "", "pen_name": "", "hide_topbar": True, "body_class": "auth-force-light"},
        )

    @app.post("/signup")
    async def signup(request: Request, username: str = Form(...), pen_name: str = Form(...), password: str = Form(...)):
        try:
            core.create_user(ctx=app.state.ctx, username=username.strip(), password=password, pen_name=pen_name.strip())
        except Exception:
            return _render(
                request,
                "signup.html",
                {
                    "error": "This username is already taken. Please try another.",
                    "username": username,
                    "pen_name": pen_name,
                    "hide_topbar": True,
                    "body_class": "auth-force-light",
                },
            )
        user = core.authenticate_user(ctx=app.state.ctx, username=username.strip(), password=password)
        return _login_response(user, next_url="/")

    @app.get("/login", response_class=HTMLResponse)
    async def login_form(request: Request):
        return _render(
            request,
            "login.html",
            {"error": None, "username": "", "hide_topbar": True, "body_class": "auth-force-light"},
        )

    @app.post("/login")
    async def login(request: Request, username: str = Form(...), password: str = Form(...)):
        try:
            user = core.authenticate_user(ctx=app.state.ctx, username=username.strip(), password=password)
        except ValueError:
            return _render(
                request,
                "login.html",
                {
                    "error": "The username or password may be incorrect.",
                    "username": username,
                    "hide_topbar": True,
                    "body_class": "auth-force-light",
                },
            )
        return _login_response(user, next_url="/")

    @app.get("/logout")
    async def logout(request: Request):
        sid = request.cookies.get("sid")
        if sid:
            app.state.sessions.pop(sid, None)
        resp = RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        resp.delete_cookie("sid")
        return resp

    @app.get("/entries", response_class=HTMLResponse)
    async def entries(request: Request, q: str = ""):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        items = list(core.search_entries(app.state.ctx, user=user, query=q, limit=200))
        return _render(request, "entries.html", {"entries": items, "q": q})

    @app.get("/book", response_class=HTMLResponse)
    async def book(request: Request, page: int = 0):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        page = max(0, int(page))
        spread_size = 10
        start = page * spread_size
        items = list(core.list_entries(app.state.ctx, user=user, limit=200))
        spread = items[start : start + spread_size]
        mid = (len(spread) + 1) // 2
        left = spread[:mid]
        right = spread[mid:]
        prev_page = max(0, page - 1)
        next_page = page + 1 if (start + spread_size) < len(items) else page
        return _render(
            request,
            "book.html",
            {
                "left": left,
                "right": right,
                "page": page,
                "prev_page": prev_page,
                "next_page": next_page,
                "hide_topbar": True,
                "body_class": "auth-force-light",
            },
        )

    @app.get("/entry/new", response_class=HTMLResponse)
    async def new_entry_form(request: Request):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        return _render(
            request,
            "new.html",
            {"title": "", "content": "", "hide_topbar": True, "body_class": "auth-force-light"},
        )

    @app.post("/entry/new")
    async def new_entry(request: Request, title: str = Form(...), content: str = Form(...), date: Optional[str] = Form(None)):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        entry_id = core.create_entry(
            app.state.ctx,
            user=user,
            title=title.strip() or "(untitled)",
            content=content,
            entry_date=(date.strip() if date else None),
        )
        if request.headers.get("x-vellichor-json") == "1":
            return JSONResponse({"entry_id": entry_id})
        return RedirectResponse(url="/", status_code=HTTP_303_SEE_OTHER)

    @app.get("/entry/{entry_id}", response_class=HTMLResponse)
    async def view_entry(request: Request, entry_id: str):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        entry = core.get_entry(app.state.ctx, user=user, entry_id=entry_id)
        return _render(request, "view.html", {"entry": entry})

    @app.get("/entry/{entry_id}/edit", response_class=HTMLResponse)
    async def edit_entry_form(request: Request, entry_id: str):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        entry = core.get_entry(app.state.ctx, user=user, entry_id=entry_id)
        return _render(request, "edit.html", {"entry": entry})

    @app.post("/entry/{entry_id}/edit")
    async def edit_entry(
        request: Request,
        entry_id: str,
        title: str = Form(...),
        content: str = Form(...),
        date: Optional[str] = Form(None),
    ):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        core.update_entry(
            app.state.ctx,
            user=user,
            entry_id=entry_id,
            title=title.strip() or "(untitled)",
            content=content,
            entry_date=(date.strip() if date else None),
        )
        return RedirectResponse(url=f"/entry/{entry_id}", status_code=HTTP_303_SEE_OTHER)

    @app.post("/entry/{entry_id}/delete")
    async def delete_entry(request: Request, entry_id: str):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        core.delete_entry(app.state.ctx, user=user, entry_id=entry_id)
        return RedirectResponse(url="/", status_code=HTTP_303_SEE_OTHER)

    @app.get("/settings", response_class=HTMLResponse)
    async def settings_form(request: Request):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        return _render(request, "settings.html", {"error": None, "pen_name": user.pen_name})

    @app.post("/settings")
    async def settings_save(request: Request, pen_name: str = Form(...)):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        core.update_pen_name(ctx=app.state.ctx, user_id=user.user_id, pen_name=pen_name.strip())
        updated = core.AuthenticatedUser(
            user_id=user.user_id,
            username=user.username,
            pen_name=pen_name.strip(),
            key=user.key,
        )
        sid = request.cookies.get("sid")
        if sid:
            app.state.sessions[sid] = updated
        return RedirectResponse(url="/", status_code=HTTP_303_SEE_OTHER)

    return app
