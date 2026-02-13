# Design Document: Asynchronous VM Deployment

## Overview

The current VM deployment process blocks the main thread, causing the frontend to timeout and display "no answer from server" errors. This design implements an asynchronous task queue system that allows VM deployment to run in the background while providing immediate feedback to users.

## Architecture

### Current Problem Analysis

**Current Flow:**
1. User requests VM creation via POST `/api/sessions`
2. Backend synchronously:
   - Generates SSH keys
   - Creates Azure VM (5-10 minutes)
   - Installs software and agents (2-5 minutes)
   - Configures environment (1-2 minutes)
3. Frontend waits 8-17 minutes for response
4. Frontend times out after 30-60 seconds, shows "no answer from server"

**Issues:**
- Main thread blocked for 8-17 minutes
- No feedback during deployment
- Timeout errors in frontend
- No ability to handle other requests during deployment
- No deployment progress tracking

### Proposed Solution

**Asynchronous Task Queue Architecture:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   FastAPI   │    │   Task      │    │   Azure     │
│             │    │   Backend   │    │   Queue     │    │   Services  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ POST /sessions   │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ 202 Accepted     │                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
       │                  │ Enqueue Task     │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │                  │                  │ Worker Process   │
       │                  │                  │─────────────────>│
       │                  │                  │                  │
       │ GET /status      │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ Status Updates   │                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
       │ WebSocket Updates│                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
       │                  │                  │ Deployment Done  │
       │                  │<─────────────────│<─────────────────│
       │                  │                  │                  │
       │ Auto-redirect    │                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
```

## Components

### 1. Task Queue Service

**Purpose:** Manage background task execution with persistence and recovery.

**Implementation:**
```python
class TaskQueueService:
    async def enqueue_task(self, task_type: str, task_data: dict) -> str:
        """Enqueue a task and return task ID"""
    
    async def get_task_status(self, task_id: str) -> dict:
        """Get current task status and progress"""
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task"""
    
    async def list_tasks(self, filters: dict = None) -> List[dict]:
        """List tasks with optional filters"""
```

**Storage:** MongoDB collection `background_tasks` with schema:
```json
{
  "_id": "task_id",
  "type": "vm_deployment",
  "status": "pending|running|completed|failed|cancelled",
  "session_id": "session_id",
  "created_at": "datetime",
  "started_at": "datetime",
  "completed_at": "datetime",
  "progress": 0-100,
  "current_step": "creating_vm|installing_agent|...",
  "error_message": "string",
  "result": "object"
}
```

### 2. Background Worker

**Purpose:** Execute tasks from the queue asynchronously.

**Implementation:**
```python
class BackgroundWorker:
    async def start(self):
        """Start worker process"""
    
    async def process_task(self, task_id: str):
        """Process a single task"""
    
    async def stop(self):
        """Stop worker gracefully"""
```

**Worker Types:**
- **VM Deployment Worker:** Handles Azure VM creation and setup
- **Cleanup Worker:** Handles resource cleanup for failed deployments
- **Health Check Worker:** Monitors running VMs

### 3. Deployment Orchestrator

**Purpose:** Coordinate multi-step deployment process.

**Implementation:**
```python
class DeploymentOrchestrator:
    async def deploy_vm(self, session_id: str, config: dict) -> dict:
        """Orchestrate VM deployment process"""
    
    async def update_progress(self, task_id: str, step: str, progress: int):
        """Update deployment progress"""
    
    async def handle_error(self, task_id: str, error: Exception):
        """Handle deployment errors with cleanup"""
```

**Deployment Steps:**
1. **Pre-flight Check** (0-30s): Validate inputs, check quotas
2. **Resource Creation** (5-10m): Create Azure resources (VM, network, etc.)
3. **Software Installation** (2-5m): Install base tools and dependencies
4. **Agent Setup** (1-3m): Configure and start AI agent
5. **Challenge Setup** (1-2m): Download and configure challenges
6. **Finalization** (0-30s): Verify setup, update status

### 4. Status Tracking Service

**Purpose:** Track and report deployment progress.

**Implementation:**
```python
class StatusTrackingService:
    async def create_status_tracker(self, session_id: str) -> str:
        """Create status tracker for session"""
    
    async def update_status(self, tracker_id: str, status: dict):
        """Update status with progress and current step"""
    
    async def get_status(self, tracker_id: str) -> dict:
        """Get current status"""
    
    async def subscribe_to_updates(self, tracker_id: str, callback):
        """Subscribe to real-time status updates"""
```

### 5. WebSocket Notification Service

**Purpose:** Provide real-time updates to frontend.

**Implementation:**
```python
class WebSocketNotificationService:
    async def broadcast_status(self, session_id: str, status: dict):
        """Broadcast status update to all connected clients"""
    
    async def notify_completion(self, session_id: str, result: dict):
        """Notify clients of deployment completion"""
    
    async def notify_error(self, session_id: str, error: dict):
        """Notify clients of deployment error"""
```

## API Design

### New Endpoints

#### 1. Create Session (Async)
```http
POST /api/sessions/async
Content-Type: application/json

{
  "vm_size": "Standard_B2s",
  "agent_type": "kiro",
  "agent_model": "deepseek-v3.2",
  "challenge_urls": ["https://..."],
  "instructions": "Solve the challenge...",
  "deploy_agent": true
}

Response: 202 Accepted
{
  "task_id": "task_123",
  "session_id": "session_456",
  "status": "queued",
  "estimated_completion_time": "2024-01-01T12:00:00Z",
  "status_url": "/api/tasks/task_123/status"
}
```

#### 2. Get Task Status
```http
GET /api/tasks/{task_id}/status

Response: 200 OK
{
  "task_id": "task_123",
  "session_id": "session_456",
  "status": "running",
  "progress": 45,
  "current_step": "installing_agent",
  "estimated_remaining_time": "PT5M",
  "started_at": "2024-01-01T11:00:00Z",
  "updated_at": "2024-01-01T11:05:00Z"
}
```

#### 3. WebSocket Connection
```javascript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws/sessions/{session_id}');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status update:', data);
  // Update UI with progress
};
```

#### 4. Polling Fallback Endpoint
```http
GET /api/sessions/{session_id}/status

Response: 200 OK
{
  "session_id": "session_456",
  "status": "creating",
  "progress": 30,
  "current_step": "creating_vm",
  "vm_ip": null,
  "estimated_completion": "2024-01-01T11:10:00Z"
}
```

## Data Models

### Task Model
```python
class Task(BaseModel):
    id: str
    type: str  # "vm_deployment", "cleanup", "health_check"
    status: Literal["pending", "queued", "running", "completed", "failed", "cancelled"]
    session_id: str
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    progress: int = 0  # 0-100
    current_step: Optional[str]
    error_message: Optional[str]
    result: Optional[dict]
```

### Deployment Status Model
```python
class DeploymentStatus(BaseModel):
    session_id: str
    status: Literal["queued", "creating_vm", "installing_software", 
                    "configuring_agent", "downloading_challenges", 
                    "finalizing", "running", "error"]
    progress: int = 0
    current_step: str
    step_progress: int = 0  # 0-100 within current step
    estimated_completion: Optional[datetime]
    vm_ip: Optional[str]
    error_details: Optional[dict]
    last_updated: datetime
```

## Implementation Strategy

### Phase 1: Basic Async Infrastructure
1. **Task Queue Service:** Implement MongoDB-based task queue
2. **Background Worker:** Simple worker that processes tasks
3. **Async Session Creation:** Modify POST `/api/sessions` to use task queue
4. **Status Endpoint:** Add GET `/api/sessions/{id}/status`

### Phase 2: Enhanced Features
1. **WebSocket Support:** Add real-time status updates
2. **Progress Tracking:** Detailed step-by-step progress
3. **Error Recovery:** Automatic retry and cleanup
4. **Task Management:** Admin endpoints for task control

### Phase 3: Advanced Features
1. **Multiple Workers:** Scale horizontally with multiple worker processes
2. **Priority Queue:** Support for different task priorities
3. **Resource Limits:** Prevent system overload
4. **Metrics & Monitoring:** Track performance and success rates

## Database Schema Updates

### New Collections

#### `background_tasks`
```json
{
  "_id": "ObjectId",
  "task_id": "string",
  "type": "string",
  "status": "string",
  "session_id": "string",
  "created_at": "ISODate",
  "started_at": "ISODate",
  "completed_at": "ISODate",
  "progress": "number",
  "current_step": "string",
  "error_message": "string",
  "result": "object",
  "retry_count": "number",
  "max_retries": "number",
  "priority": "number"
}
```

#### `deployment_status`
```json
{
  "_id": "ObjectId",
  "session_id": "string",
  "status": "string",
  "progress": "number",
  "current_step": "string",
  "step_progress": "number",
  "estimated_completion": "ISODate",
  "vm_ip": "string",
  "error_details": "object",
  "last_updated": "ISODate",
  "history": [
    {
      "timestamp": "ISODate",
      "status": "string",
      "progress": "number",
      "message": "string"
    }
  ]
}
```

## Error Handling

### Deployment Failures
1. **Azure Resource Creation Failures:** Clean up partial resources
2. **Network Timeouts:** Implement retry with exponential backoff
3. **SSH Connection Failures:** Wait for VM to be ready, then retry
4. **Agent Installation Failures:** Fall back to manual setup mode

### System Failures
1. **Worker Process Crash:** Tasks remain in queue for other workers
2. **Database Connection Loss:** Queue tasks in memory, persist when DB returns
3. **Memory/CPU Exhaustion:** Implement circuit breaker pattern

## Performance Considerations

### Scalability
- **Horizontal Scaling:** Multiple worker processes can run concurrently
- **Load Balancing:** Distribute tasks across workers based on load
- **Resource Limits:** Limit concurrent deployments per user/system

### Monitoring
- **Metrics:** Track deployment times, success rates, error rates
- **Alerts:** Notify admins of system issues or failed deployments
- **Logging:** Detailed logs for debugging deployment issues

### Optimization
- **Caching:** Cache common deployment configurations
- **Parallel Steps:** Execute independent steps in parallel where possible
- **Resource Reuse:** Reuse resource groups and networks where appropriate

## Security Considerations

### Task Isolation
- Each task runs in isolated context
- No shared state between tasks
- Secure credential handling

### Access Control
- Users can only see their own tasks
- Admin endpoints require authentication
- Rate limiting per user

### Data Protection
- Encrypt sensitive data in task queue
- Secure WebSocket connections
- Audit logging for all operations

## Testing Strategy

### Unit Tests
- Task queue operations
- Worker process logic
- Status tracking

### Integration Tests
- End-to-end deployment flow
- Error handling scenarios
- Concurrent deployments

### Property-Based Tests
- Task idempotency
- Progress monotonicity
- Error recovery properties

## Migration Plan

### Step 1: Add Async Support Alongside Sync
- Keep existing POST `/api/sessions` endpoint
- Add new POST `/api/sessions/async` endpoint
- Both write to same database collections

### Step 2: Transition Frontend
- Update frontend to use async endpoint
- Add progress indicators
- Implement WebSocket/polling for status

### Step 3: Deprecate Sync Endpoint
- Mark sync endpoint as deprecated
- Redirect to async endpoint with warning
- Eventually remove sync endpoint

## Success Metrics

### Performance Metrics
- **Response Time:** < 1 second for initial response
- **Deployment Time:** < 10 minutes for complete deployment
- **Success Rate:** > 95% successful deployments
- **Concurrent Deployments:** Support 10+ concurrent deployments

### User Experience Metrics
- **Time to First Feedback:** < 1 second
- **Status Update Frequency:** Every 10-30 seconds
- **Error Clarity:** Clear error messages with recovery options
- **Progress Accuracy:** Accurate progress estimates

### System Metrics
- **Queue Length:** < 10 pending tasks
- **Worker Utilization:** 60-80% optimal
- **Memory Usage:** < 1GB per worker
- **Database Load:** < 50% capacity during peak