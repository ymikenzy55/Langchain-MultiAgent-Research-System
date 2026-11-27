from langchain.tools import tool
from dotenv import load_dotenv
import os
import requests
from tavily import TavilyClient
from bs4 import BeautifulSoup
from readability import Document
import trafilatura 
import re

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

@tool
def web_search(query : str) -> str:
    """Search the web for recent and reliable information on a topic . Returns Titles , URLs and contents"""
    results = tavily.search(query=query, max_results=5)

    out=[]

    for r in results['results']:
        out.append(
            f"Title: {r['title']}\nURL: {r['url']}\nContent: {r['content']}\n"
        )

    return "\n-----\n".join(out)

@tool
def web_scrapper(url: str) -> str:
    """Scrapes the content of a webpage given its URL. Falls back to trafilatura if BeautifulSoup fails."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        text = trafilatura.extract(response.text, include_comments=False, include_tables=False)
        if not text:
            raise ValueError("trafilatura returned empty")
    except Exception:
        text = trafilatura.fetch_url(url)
        if not text:
            return "Failed to scrape the page."
        text = trafilatura.extract(text, include_comments=False, include_tables=False)
        if not text:
            return "Failed to extract content from the page."

    lines = [line.strip() for line in text.splitlines()]
    cleaned = re.sub(r"\n{3,}", "\n\n", "\n".join(line for line in lines if line))
    return cleaned.strip()

