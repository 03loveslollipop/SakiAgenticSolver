import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import apiClient from '../services/api';
import 'xterm/css/xterm.css';
import './Terminal.css';

interface TerminalProps {
  sessionId: string;
}

const Terminal = ({ sessionId }: TerminalProps) => {
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
      rows: 30,
      cols: 100,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    connectWebSocket();

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
    };
  }, [sessionId, t]);

  const connectWebSocket = () => {
    const wsUrl = apiClient.getTerminalWebSocketURL(sessionId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      if (xtermRef.current) {
        xtermRef.current.writeln(`${t('terminal.connectedMessage')}\r\n`);
      }
    };

    ws.onmessage = (event) => {
      if (xtermRef.current) {
        xtermRef.current.write(event.data);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError(t('terminal.websocketError'));
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\r\n${t('terminal.connectionClosed')}`);
      }

      if (event.code !== 1000) {
        setError(t('terminal.connectionLost'));
        reconnectTimeoutRef.current = setTimeout(() => {
          if (xtermRef.current) {
            xtermRef.current.writeln(`${t('terminal.reconnectingMessage')}\r\n`);
          }
          connectWebSocket();
        }, 3000);
      }
    };

    wsRef.current = ws;

    if (xtermRef.current) {
      xtermRef.current.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  };

  const handleReconnect = () => {
    setError(null);
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
    connectWebSocket();
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {connected ? t('terminal.connected') : t('terminal.disconnected')}
          </span>
        </div>
        {error && (
          <div className="terminal-error">
            <span>{error}</span>
            <button onClick={handleReconnect} className="btn btn-small btn-secondary">
              {t('terminal.reconnect')}
            </button>
          </div>
        )}
      </div>
      <div ref={terminalRef} className="terminal" />
    </div>
  );
};

export default Terminal;
