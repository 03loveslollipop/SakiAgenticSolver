import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import { WriteupCategory } from '../types';
import './WriteupUploader.css';

interface WriteupUploaderProps {
  sessionId: string;
}

const WriteupUploader = ({ sessionId }: WriteupUploaderProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<WriteupCategory | ''>('');
  const [technologies, setTechnologies] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseYamlFrontmatter = (text: string): {
    category?: WriteupCategory;
    technologies?: string[];
    content: string;
  } => {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = text.match(frontmatterRegex);

    if (!match) {
      return { content: text };
    }

    const frontmatter = match[1];
    const mainContent = match[2];

    let parsedCategory: WriteupCategory | undefined;
    let parsedTechnologies: string[] = [];

    const categoryMatch = frontmatter.match(/category:\s*(\w+)/);
    if (categoryMatch) {
      parsedCategory = categoryMatch[1] as WriteupCategory;
    }

    const techMatches = frontmatter.match(/technologies:\s*\n((?:\s*-\s*.+\n?)+)/);
    if (techMatches) {
      parsedTechnologies = techMatches[1]
        .split('\n')
        .map((line) => line.trim().replace(/^-\s*/, ''))
        .filter((tech) => tech.length > 0);
    }

    return {
      category: parsedCategory,
      technologies: parsedTechnologies,
      content: mainContent,
    };
  };

  const handleLoadFromVM = async () => {
    try {
      setError(null);
      alert(t('writeupUploader.loadFromVmInfo'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadWriteupFromVm'));
    }
  };

  const handleUpload = async () => {
    if (!content.trim()) {
      setError(t('errors.writeupContentRequired'));
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const parsed = parseYamlFrontmatter(content);
      const finalCategory = parsed.category || (category as WriteupCategory) || undefined;
      const finalTechnologies =
        parsed.technologies ||
        (technologies ? technologies.split(',').map((value) => value.trim()) : []);

      await apiClient.uploadWriteup(sessionId, content, finalCategory, finalTechnologies);

      setUploaded(true);
      alert(t('writeupUploader.uploadSuccessAlert'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToUploadWriteup'));
    } finally {
      setUploading(false);
    }
  };

  const handlePasteExample = () => {
    const example = `---
category: pwn
technologies:
  - buffer overflow
  - gdb
  - pwntools
---

# Challenge Name

## Overview
Brief description of the challenge...

## Initial Analysis
What I discovered first...

## Approach
The methodology used...

## Solution
Step-by-step solution...

## Flag
\`CTF{example_flag}\`
`;
    setContent(example);
  };

  return (
    <div className="writeup-uploader">
      <div className="uploader-header">
        <div className="uploader-title">
          <h3>{t('writeupUploader.title')}</h3>
          <p>{t('writeupUploader.subtitle')}</p>
        </div>
        <div className="uploader-actions">
          <button onClick={handlePasteExample} className="btn btn-secondary btn-small">
            {t('writeupUploader.actions.pasteExample')}
          </button>
          <button onClick={handleLoadFromVM} className="btn btn-secondary btn-small">
            {t('writeupUploader.actions.loadFromVm')}
          </button>
        </div>
      </div>

      {uploaded && (
        <div className="success-banner">
          {t('writeupUploader.uploadedBanner')}
        </div>
      )}

      {error && (
        <div className="error-banner">
          <strong>{t('common.error')}:</strong> {error}
        </div>
      )}

      <div className="uploader-content">
        <div className="uploader-info">
          <h4>{t('writeupUploader.formatInstructionsTitle')}</h4>
          <p>{t('writeupUploader.formatInstructionsBody')}</p>
          <pre className="format-example">
            {`---
category: pwn|crypto|reversing|web|forensics|misc
technologies:
  - tool1
  - technique1
  - concept1
---`}
          </pre>
          <p>{t('writeupUploader.metadataFallbackHint')}</p>
        </div>

        <div className="metadata-fields">
          <div className="field-group">
            <label className="field-label">{t('writeupUploader.categoryLabel')}</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as WriteupCategory)}
              className="field-select"
            >
              <option value="">{t('writeupUploader.categoryPlaceholder')}</option>
              <option value="pwn">{t('writeups.categories.pwn')}</option>
              <option value="crypto">{t('writeups.categories.crypto')}</option>
              <option value="reversing">{t('writeups.categories.reversing')}</option>
              <option value="web">{t('writeups.categories.web')}</option>
              <option value="forensics">{t('writeups.categories.forensics')}</option>
              <option value="misc">{t('writeups.categories.misc')}</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">{t('writeupUploader.technologiesLabel')}</label>
            <input
              type="text"
              value={technologies}
              onChange={(event) => setTechnologies(event.target.value)}
              placeholder={t('writeupUploader.technologiesPlaceholder')}
              className="field-input"
            />
          </div>
        </div>

        <div className="content-editor">
          <label className="field-label">{t('writeupUploader.contentLabel')}</label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t('writeupUploader.contentPlaceholder')}
            className="content-textarea"
            rows={20}
          />
        </div>

        <div className="uploader-footer">
          <button
            onClick={handleUpload}
            className="btn btn-primary"
            disabled={uploading || !content.trim()}
          >
            {uploading ? t('writeupUploader.uploading') : t('writeupUploader.upload')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WriteupUploader;
