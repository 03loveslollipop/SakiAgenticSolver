import { useState } from 'react';
import { WriteupCategory } from '../types';
import apiClient from '../services/api';
import './WriteupUploader.css';

interface WriteupUploaderProps {
  sessionId: string;
}

const WriteupUploader = ({ sessionId }: WriteupUploaderProps) => {
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

    // Parse category
    const categoryMatch = frontmatter.match(/category:\s*(\w+)/);
    if (categoryMatch) {
      parsedCategory = categoryMatch[1] as WriteupCategory;
    }

    // Parse technologies (array format)
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
      // Try to load writeup.md from the VM (this would need a new API endpoint)
      // For now, we'll show a message
      alert(
        'To load writeup from VM, you can copy the content from the Terminal tab or use SSH to retrieve the file.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load writeup from VM');
    }
  };

  const handleUpload = async () => {
    if (!content.trim()) {
      setError('Writeup content is required');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Parse YAML frontmatter if present
      const parsed = parseYamlFrontmatter(content);

      // Use parsed values or form values
      const finalCategory = parsed.category || (category as WriteupCategory) || undefined;
      const finalTechnologies =
        parsed.technologies ||
        (technologies ? technologies.split(',').map((t) => t.trim()) : []);

      await apiClient.uploadWriteup(sessionId, content, finalCategory, finalTechnologies);

      setUploaded(true);
      alert('Writeup uploaded successfully to the database!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload writeup');
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
          <h3>Writeup</h3>
          <p>Upload the challenge writeup to the database for future reference</p>
        </div>
        <div className="uploader-actions">
          <button onClick={handlePasteExample} className="btn btn-secondary btn-small">
            Paste Example
          </button>
          <button onClick={handleLoadFromVM} className="btn btn-secondary btn-small">
            Load from VM
          </button>
        </div>
      </div>

      {uploaded && (
        <div className="success-banner">
          ✓ Writeup uploaded successfully! It's now available in the writeups database.
        </div>
      )}

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="uploader-content">
        <div className="uploader-info">
          <h4>Format Instructions</h4>
          <p>
            Include YAML frontmatter at the top of your writeup with category and technologies:
          </p>
          <pre className="format-example">
            {`---
category: pwn|crypto|reversing|web|forensics|misc
technologies:
  - tool1
  - technique1
  - concept1
---`}
          </pre>
          <p>Or fill in the metadata fields below if not using frontmatter.</p>
        </div>

        <div className="metadata-fields">
          <div className="field-group">
            <label className="field-label">Category (optional if in frontmatter)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WriteupCategory)}
              className="field-select"
            >
              <option value="">Select category...</option>
              <option value="pwn">PWN</option>
              <option value="crypto">Crypto</option>
              <option value="reversing">Reversing</option>
              <option value="web">Web</option>
              <option value="forensics">Forensics</option>
              <option value="misc">Misc</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">
              Technologies (optional if in frontmatter, comma-separated)
            </label>
            <input
              type="text"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              placeholder="e.g., buffer overflow, gdb, pwntools"
              className="field-input"
            />
          </div>
        </div>

        <div className="content-editor">
          <label className="field-label">Writeup Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your writeup content here..."
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
            {uploading ? 'Uploading...' : 'Upload to Database'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WriteupUploader;
