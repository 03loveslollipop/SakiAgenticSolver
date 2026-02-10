import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import VMCreationForm from './components/VMCreationForm';
import SessionDetail from './components/SessionDetail';
import WriteupsBrowser from './components/WriteupsBrowser';
import WriteupDetail from './components/WriteupDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>CTF Automation Platform</h1>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<VMCreationForm />} />
            <Route path="/sessions/:sessionId" element={<SessionDetail />} />
            <Route path="/writeups" element={<WriteupsBrowser />} />
            <Route path="/writeups/:sessionId" element={<WriteupDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
