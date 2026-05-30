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
    async def index(request: Request, q: str = ""):
        latest = core.latest_entry(app.state.ctx)
        total = core.count_entries(app.state.ctx)
        entries = list(core.list_entries(app.state.ctx, limit=6))
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "latest": latest,
                "total": total,
                "entries": entries,
                "hide_topbar": True,
            },
        )

    @app.get("/entries", response_class=HTMLResponse)
    async def entries(request: Request, q: str = ""):
        items = list(core.search_entries(app.state.ctx, query=q, limit=200))
        return templates.TemplateResponse("entries.html", {"request": request, "entries": items, "q": q})

    @app.get("/entry/new", response_class=HTMLResponse)
    async def new_entry_form(request: Request):
        return templates.TemplateResponse("new.html", {"request": request, "title": "", "content": ""})

    @app.post("/entry/new")
    async def new_entry(title: str = Form(...), content: str = Form(...)):
        entry_id = core.create_entry(app.state.ctx, title=title.strip() or "(untitled)", content=content)
        return RedirectResponse(url=f"/entry/{entry_id}", status_code=HTTP_303_SEE_OTHER)

    @app.get("/entry/{entry_id}", response_class=HTMLResponse)
    async def view_entry(request: Request, entry_id: str):
        entry = core.get_entry(app.state.ctx, entry_id=entry_id)
        return templates.TemplateResponse("view.html", {"request": request, "entry": entry})

    @app.get("/entry/{entry_id}/edit", response_class=HTMLResponse)
    async def edit_entry_form(request: Request, entry_id: str):
        entry = core.get_entry(app.state.ctx, entry_id=entry_id)
        return templates.TemplateResponse("edit.html", {"request": request, "entry": entry})

    @app.post("/entry/{entry_id}/edit")
    async def edit_entry(entry_id: str, title: str = Form(...), content: str = Form(...)):
        core.update_entry(app.state.ctx, entry_id=entry_id, title=title.strip() or "(untitled)", content=content)
        return RedirectResponse(url=f"/entry/{entry_id}", status_code=HTTP_303_SEE_OTHER)

    @app.post("/entry/{entry_id}/delete")
    async def delete_entry(entry_id: str):
        core.delete_entry(app.state.ctx, entry_id=entry_id)
        return RedirectResponse(url="/", status_code=HTTP_303_SEE_OTHER)

    return app
