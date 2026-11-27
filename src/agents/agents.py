from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from src.tools.tools import web_search, web_scrapper
from dotenv import load_dotenv 

load_dotenv()

# Model Initialization
llm = ChatGroq(model ="openai/gpt-oss-120b", temperature=0)

# 1st Agent : Search Agent
def build_search_agent():
    return create_agent(
        model=llm,
        tools=[web_search]
    )

# 2nd Agent : Scrapping Agent
def build_reader_agent():
    return create_agent(
        model=llm,
        tools=[web_scrapper]
    )

writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a concise research writer. Write short, clean, structured reports. No markdown."),
    ("human", """Write a brief report on: {topic}

Research:
{research}

Format:
- Introduction (2 sentences)
- Key Findings (3 bullet points)
- Conclusion (2 sentences)
- Sources (URLs only)"""),
])

writer_chain = writer_prompt | llm | StrOutputParser()

#critic_chain
critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a research critic. Be brief and specific."),
    ("human", """Review this report briefly.

Report:
{report}

Respond:
Score: x/10
Strengths: (2 bullets)
Weaknesses: (2 bullets)
Verdict: (1 line)"""),
])

critic_chain = critic_prompt | llm | StrOutputParser()
