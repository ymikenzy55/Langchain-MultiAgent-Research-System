import gradio as gr
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.pipelines.pipeline import run_research_pipeline
import json
import threading
import queue

# Mount FastAPI inside Gradio
app = gr.mount_gradio_app

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

fastapi_app = FastAPI(title="Research Agent API")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

@fastapi_app.post("/research")
def research(req: ResearchRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    q: queue.Queue = queue.Queue()

    def emit(step: str, message: str):
        q.put({"type": "progress", "step": step, "message": message})

    def run():
        try:
            result = run_research_pipeline(req.topic, emit=emit)
            q.put({"type": "result", "data": result})
        except Exception as e:
            q.put({"type": "error", "message": str(e)})

    thread = threading.Thread(target=run)
    thread.start()

    def stream():
        try:
            while True:
                item = q.get()
                yield f"data: {json.dumps(item)}\n\n"
                if item["type"] in ("result", "error"):
                    break
        except GeneratorExit:
            pass

    return StreamingResponse(stream(), media_type="text/event-stream")


# Minimal Gradio UI (required by HF Spaces)
with gr.Blocks() as demo:
    gr.Markdown("## Research Agent API")
    gr.Markdown("This Space exposes a FastAPI backend. Use the frontend at your Vercel URL to interact with it.")

app = gr.mount_gradio_app(fastapi_app, demo, path="/")
