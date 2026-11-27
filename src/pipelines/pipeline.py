from src.agents.agents import build_search_agent, build_reader_agent, writer_chain, critic_chain
import time
from typing import Callable

def run_research_pipeline(topic: str, emit: Callable[[str, str], None] = None) -> dict:
    def log(step: str, message: str):
        print(message)
        if emit:
            emit(step, message)

    state = {}

    log("search", "Search agent is scanning the web for relevant information...")
    search_agent = build_search_agent()
    search_result = search_agent.invoke({
        "messages": [("user", f"Find 3 key facts about: {topic}")]
    })
    state["search_result"] = search_result['messages'][-1].content[:1500]
    log("search", "Search complete.")

    log("scrape", "Reader agent is picking the best URL and scraping content...")
    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages": [("user",
            f"Pick the most relevant URL from these results about '{topic}' and scrape it.\n\n"
            f"Search Results:\n{state['search_result'][:500]}"
        )]
    })
    state['scraped_content'] = reader_result['messages'][-1].content[:1500]
    log("scrape", "Scraping complete.")

    log("write", "Writer agent is drafting the research report...")
    research_combined = (
        f"SEARCH: {state['search_result'][:800]}\n\n"
        f"SCRAPED: {state['scraped_content'][:800]}"
    )
    state["report"] = writer_chain.invoke({
        "topic": topic,
        "research": research_combined
    })
    log("write", "Report drafted.")

    log("critic", "Critic agent is reviewing and scoring the report...")
    time.sleep(20)
    state["feedback"] = critic_chain.invoke({
        "report": state['report'][:1500]
    })
    log("critic", "Review complete.")

    return state