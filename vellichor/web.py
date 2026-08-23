from __future__ import annotations

import base64
import secrets
from pathlib import Path
from typing import Optional

from fastapi import Body, FastAPI, Form, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.status import HTTP_303_SEE_OTHER

from . import core, crypto
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
        resp.set_cookie("sid", sid, httponly=True, samesite="lax")
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

    @app.delete("/api/entries/{entry_id}")
    async def api_delete_entry(request: Request, entry_id: str):
        user = _require_user(request)
        core.delete_entry(app.state.ctx, user=user, entry_id=entry_id)
        return {"ok": True}

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
            {"error": None, "username": "", "pen_name": "", "hide_topbar": True, "body_class": "auth-force-light spa-auth"},
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
                    "error": "Username already exists",
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
            {"error": None, "username": "", "hide_topbar": True, "body_class": "auth-force-light spa-auth"},
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
                    "error": "Invalid username or password",
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
