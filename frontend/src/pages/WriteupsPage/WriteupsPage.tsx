import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, Container, Input, Loading } from '../../components';
import apiClient from '../../services/api';
import { Writeup, WriteupCategory } from '../../types';

const PAGE_SIZE = 20;

export const WriteupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WriteupCategory | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const formatDate = useCallback((value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t('common.unknownTime');
    }
    return parsed.toLocaleString();
  }, [t]);

  const loadWriteups = useCallback(async (page: number, category: WriteupCategory | '') => {
    setLoading(true);
    setError(null);

    try {
      const skip = page * PAGE_SIZE;
      const data = await apiClient.getWriteups(skip, PAGE_SIZE, category || undefined);
      setWriteups(data);
      setHasMore(data.length === PAGE_SIZE);
      setIsSearchMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadWriteups'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadWriteups(currentPage, categoryFilter);
  }, [currentPage, categoryFilter, loadWriteups]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setCurrentPage(0);
      await loadWriteups(0, categoryFilter);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const data = await apiClient.searchWriteups({
        query: searchQuery.trim(),
        category: categoryFilter || undefined,
      });
      setWriteups(data);
      setIsSearchMode(true);
      setHasMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToSearchWriteups'));
    } finally {
      setSearching(false);
    }
  };

  const headerActions = (
    <>
      <Button
        type="button"
        variant="normal"
        onClick={() => loadWriteups(currentPage, categoryFilter)}
        disabled={loading}
      >
        {t('common.refresh')}
      </Button>
      {isSearchMode && (
        <Button
          type="button"
          variant="success"
          onClick={() => {
            setSearchQuery('');
            setCurrentPage(0);
            loadWriteups(0, categoryFilter);
          }}
        >
          {t('common.clearSearch')}
        </Button>
      )}
    </>
  );

  return (
    <AppShell
      title={t('writeups.title')}
      subtitle={t('writeups.subtitle')}
      headerActions={headerActions}
    >
      <Container variant="light" padding="lg" className="mb-lg">
        <div className="flex flex-col tablet:flex-row gap-md">
          <Input
            label={t('common.search')}
            name="search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('writeups.searchPlaceholder')}
            disabled={loading || searching}
            className="flex-1"
          />
          <div className="min-w-[220px]">
            <label htmlFor="categoryFilter" className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
              {t('writeups.category')}
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value as WriteupCategory | '');
                setCurrentPage(0);
              }}
              className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan"
              disabled={loading || searching}
            >
              <option value="">{t('writeups.allCategories')}</option>
              <option value="pwn">{t('writeups.categories.pwn')}</option>
              <option value="crypto">{t('writeups.categories.crypto')}</option>
              <option value="reversing">{t('writeups.categories.reversing')}</option>
              <option value="web">{t('writeups.categories.web')}</option>
              <option value="forensics">{t('writeups.categories.forensics')}</option>
              <option value="misc">{t('writeups.categories.misc')}</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="primary" onClick={handleSearch} disabled={loading || searching}>
              {searching ? t('writeups.searching') : t('common.search')}
            </Button>
          </div>
        </div>
      </Container>

      {error && (
        <Container variant="light" padding="md" className="mb-lg border-accent-pink">
          <p className="font-pixel text-sm text-accent-pink">{error}</p>
        </Container>
      )}

      {loading ? (
        <Container variant="light" padding="lg">
          <div className="flex justify-center py-md">
            <Loading size="lg" text={t('writeups.loading')} />
          </div>
        </Container>
      ) : writeups.length === 0 ? (
        <Container variant="light" padding="lg">
          <p className="font-pixel text-sm text-neutral-teal">
            {t('writeups.empty')}
          </p>
        </Container>
      ) : (
        <>
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-lg mb-lg">
            {writeups.map((writeup) => (
              <Container key={`${writeup.sessionId}-${writeup.id || 'preview'}`} variant="light" padding="md">
                <div className="flex items-start justify-between gap-sm mb-sm">
                  <h3 className="font-pixel text-sm text-neutral-darkPurple">
                    {t('writeups.card.session', { id: writeup.sessionId.slice(0, 8) })}
                  </h3>
                  {writeup.category && (
                    <span className="font-pixel text-xs text-neutral-teal uppercase">
                      {t(`writeups.categories.${writeup.category}`)}
                    </span>
                  )}
                </div>
                <p className="font-pixel text-xs text-neutral-teal mb-xs">
                  {t('writeups.card.agent', {
                    agentType: writeup.agentType,
                    agentModel: writeup.agentModel,
                  })}
                </p>
                <p className="font-pixel text-xs text-neutral-teal mb-sm">
                  {t('writeups.card.completed', { time: formatDate(writeup.completionTimestamp) })}
                </p>
                <p className="font-pixel text-xs text-neutral-darkPurple mb-md">
                  {writeup.content
                    ? `${writeup.content.slice(0, 160)}${writeup.content.length > 160 ? '...' : ''}`
                    : t('writeups.card.noPreview')}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => navigate(`/writeups/${writeup.sessionId}`)}
                >
                  {t('writeups.card.view')}
                </Button>
              </Container>
            ))}
          </div>

          {!isSearchMode && (
            <Container variant="light" padding="md">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="normal"
                  onClick={() => setCurrentPage((previous) => Math.max(0, previous - 1))}
                  disabled={currentPage === 0 || loading}
                >
                  {t('common.previous')}
                </Button>
                <p className="font-pixel text-xs text-neutral-darkPurple">
                  {t('writeups.page', { page: currentPage + 1 })}
                </p>
                <Button
                  type="button"
                  variant="normal"
                  onClick={() => setCurrentPage((previous) => previous + 1)}
                  disabled={!hasMore || loading}
                >
                  {t('common.next')}
                </Button>
              </div>
            </Container>
          )}
        </>
      )}
    </AppShell>
  );
};
