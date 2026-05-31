from __future__ import annotations

import secrets
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.status import HTTP_303_SEE_OTHER

from . import core


def create_app(*, ctx: core.Context) -> FastAPI:
    app = FastAPI()
    base_dir = Path(__file__).resolve().parent
    templates = Jinja2Templates(directory=str(base_dir / "templates"))

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

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        latest = core.latest_entry(app.state.ctx, user=user)
        total = core.count_entries(app.state.ctx, user=user)
        entries = list(core.list_entries(app.state.ctx, user=user, limit=6))
        return _render(request, "index.html", {"latest": latest, "total": total, "entries": entries, "hide_topbar": True})

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

    @app.get("/entry/new", response_class=HTMLResponse)
    async def new_entry_form(request: Request):
        user = _get_user(request)
        if user is None:
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        return _render(request, "new.html", {"title": "", "content": "", "hide_topbar": True})

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
        return RedirectResponse(url=f"/entry/{entry_id}", status_code=HTTP_303_SEE_OTHER)

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
