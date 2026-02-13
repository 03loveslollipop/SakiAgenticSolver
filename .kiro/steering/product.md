# CTF Challenge Automation Platform

## Product Overview
A comprehensive platform for automating CTF (Capture The Flag) challenge solving using AI agents on Azure VMs. The platform creates isolated virtual machines, installs AI agents (Kiro/Copilot), and provides real-time terminal access for solving security challenges.

## Core Value Proposition
- **Automated CTF Solving**: Create isolated Azure VMs for each challenge with pre-configured AI agents
- **Real-time Collaboration**: WebSocket-based terminal access for interactive problem solving
- **Knowledge Management**: Store and retrieve writeups for challenge solutions
- **Agent Integration**: Support for multiple AI agents with customizable configurations

## Key Features
- **VM Management**: Create, monitor, and delete Azure VMs with automated setup
- **Agent Support**: Kiro and GitHub Copilot agents with configurable models
- **Terminal Access**: Real-time web terminal via WebSocket connections
- **File Management**: Edit agent configuration files (AGENT.md, TOOLS.md, BASE_PROMPT.md)
- **Writeup System**: Store, search, and retrieve challenge solutions
- **MCP Servers**: Integration with Model Context Protocol for enhanced capabilities

## Target Users
- Security researchers and CTF players
- Cybersecurity students and educators
- Penetration testing teams
- AI/ML researchers exploring agent-based problem solving

## Deployment Architecture
- **Frontend**: React on Vercel (global CDN)
- **Backend**: FastAPI on Northflank (containerized)
- **Database**: MongoDB (Northflank addon)
- **Compute**: Azure VMs for challenge solving

## Success Metrics
- VM creation time under 5 minutes
- Agent response time under 2 seconds
- Writeup retrieval accuracy > 95%
- System uptime > 99.5%