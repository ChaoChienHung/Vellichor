from __future__ import annotations

from pathlib import Path

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
    app.mount("/static", StaticFiles(directory=str(base_dir / "static")), name="static")

    @app.get("/", response_class=HTMLResponse)
    def index(request: Request, q: str = ""):
        entries = list(core.search_entries(app.state.ctx, query=q, limit=200))
        return templates.TemplateResponse(
            request,
            "index.html",
            {"entries": entries, "q": q},
        )

    @app.get("/entry/new", response_class=HTMLResponse)
    def new_entry_form(request: Request):
        return templates.TemplateResponse(request, "new.html", {"title": "", "content": ""})

    @app.post("/entry/new")
    def new_entry(title: str = Form(...), content: str = Form(...)):
        entry_id = core.create_entry(app.state.ctx, title=title.strip() or "(untitled)", content=content)
        return RedirectResponse(url=f"/entry/{entry_id}", status_code=HTTP_303_SEE_OTHER)

    @app.get("/entry/{entry_id}", response_class=HTMLResponse)
    def view_entry(request: Request, entry_id: str):
        entry = core.get_entry(app.state.ctx, entry_id=entry_id)
        return templates.TemplateResponse(request, "view.html", {"entry": entry})

    @app.get("/entry/{entry_id}/edit", response_class=HTMLResponse)
    def edit_entry_form(request: Request, entry_id: str):
        entry = core.get_entry(app.state.ctx, entry_id=entry_id)
        return templates.TemplateResponse(request, "edit.html", {"entry": entry})

    @app.post("/entry/{entry_id}/edit")
    def edit_entry(entry_id: str, title: str = Form(...), content: str = Form(...)):
        core.update_entry(app.state.ctx, entry_id=entry_id, title=title.strip() or "(untitled)", content=content)
        return RedirectResponse(url=f"/entry/{entry_id}", status_code=HTTP_303_SEE_OTHER)

    @app.post("/entry/{entry_id}/delete")
    def delete_entry(entry_id: str):
        core.delete_entry(app.state.ctx, entry_id=entry_id)
        return RedirectResponse(url="/", status_code=HTTP_303_SEE_OTHER)

    return app
