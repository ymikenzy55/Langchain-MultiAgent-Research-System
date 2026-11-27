from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.pipelines.pipeline import run_research_pipeline
import json
import threading
import queue

app = FastAPI(title="Research Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

@app.post("/research")
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
        while True:
            item = q.get()
            yield f"data: {json.dumps(item)}\n\n"
            if item["type"] in ("result", "error"):
                break

    return StreamingResponse(stream(), media_type="text/event-stream")
