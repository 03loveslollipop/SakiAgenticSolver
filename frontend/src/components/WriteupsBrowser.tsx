import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Writeup, WriteupCategory } from '../types';
import apiClient from '../services/api';
import './WriteupsBrowser.css';

const WriteupsBrowser = () => {
  const navigate = useNavigate();
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WriteupCategory | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    loadWriteups();
  }, [currentPage, categoryFilter]);

  const loadWriteups = async () => {
    try {
      setLoading(true);
      setError(null);

      const skip = currentPage * pageSize;
      const data = await apiClient.getWriteups(
        skip,
        pageSize,
        categoryFilter || undefined
      );

      setWriteups(data);
      setHasMore(data.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load writeups');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadWriteups();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await apiClient.searchWriteups({
        query: searchQuery,
        category: categoryFilter || undefined,
      });

      setWriteups(data);
      setHasMore(false); // Search results don't paginate
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search writeups');
    } finally {
      setLoading(false);
    }
  };

  const handleWriteupClick = (sessionId: string) => {
    navigate(`/writeups/${sessionId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNextPage = () => {
    setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleCategoryChange = (category: WriteupCategory | '') => {
    setCategoryFilter(category);
    setCurrentPage(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading && writeups.length === 0) {
    return (
      <div className="writeups-browser">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading writeups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="writeups-browser">
      <div className="browser-header">
        <div className="header-left">
          <button onClick={handleBackToDashboard} className="btn btn-secondary btn-small">
            ← Back to Dashboard
          </button>
          <h2>Challenge Writeups</h2>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search writeups by keywords..."
            className="search-input"
          />
          <button onClick={handleSearch} className="btn btn-primary">
            Search
          </button>
        </div>

        <div className="filter-bar">
          <label className="filter-label">Filter by category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value as WriteupCategory | '')}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="pwn">PWN</option>
            <option value="crypto">Crypto</option>
            <option value="reversing">Reversing</option>
            <option value="web">Web</option>
            <option value="forensics">Forensics</option>
            <option value="misc">Misc</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Writeups List */}
      {writeups.length === 0 ? (
        <div className="empty-state">
          <p>No writeups found. Upload your first writeup from a session!</p>
        </div>
      ) : (
        <>
          <div className="writeups-grid">
            {writeups.map((writeup) => (
              <div
                key={writeup.sessionId}
                className="writeup-card"
                onClick={() => handleWriteupClick(writeup.sessionId)}
              >
                <div className="writeup-card-header">
                  <h3>Session {writeup.sessionId.substring(0, 8)}</h3>
                  {writeup.category && (
                    <span className={`category-badge category-${writeup.category}`}>
                      {writeup.category}
                    </span>
                  )}
                </div>
                <div className="writeup-card-body">
                  <div className="writeup-info-row">
                    <span className="label">Agent:</span>
                    <span className="value">
                      {writeup.agentType} ({writeup.agentModel})
                    </span>
                  </div>
                  <div className="writeup-info-row">
                    <span className="label">Completed:</span>
                    <span className="value">{formatDate(writeup.completionTimestamp)}</span>
                  </div>
                  {writeup.technologies.length > 0 && (
                    <div className="technologies">
                      <span className="label">Technologies:</span>
                      <div className="tech-tags">
                        {writeup.technologies.slice(0, 5).map((tech, idx) => (
                          <span key={idx} className="tech-tag">
                            {tech}
                          </span>
                        ))}
                        {writeup.technologies.length > 5 && (
                          <span className="tech-tag">+{writeup.technologies.length - 5}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {writeup.challengeUrls.length > 0 && (
                    <div className="writeup-info-row">
                      <span className="label">Challenges:</span>
                      <span className="value">{writeup.challengeUrls.length} file(s)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0 || loading}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className="page-info">Page {currentPage + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={!hasMore || loading}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WriteupsBrowser;
