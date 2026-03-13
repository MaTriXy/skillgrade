import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs-extra', () => ({
  readdir: vi.fn(),
  readJSON: vi.fn(),
}));

import * as fs from 'fs-extra';
import { runCliPreview } from '../src/reporters/cli';

const mockReaddir = vi.mocked(fs.readdir);
const mockReadJSON = vi.mocked(fs.readJSON);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('runCliPreview', () => {
  it('prints message when no reports found', async () => {
    mockReaddir.mockResolvedValue([] as any);
    const logSpy = vi.spyOn(console, 'log');

    await runCliPreview('/results');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No reports found'));
  });

  it('displays report data for valid JSON files', async () => {
    mockReaddir.mockResolvedValue(['task_2026-01-01T00-00-00.json'] as any);
    mockReadJSON.mockResolvedValue({
      task: 'test-task',
      pass_rate: 0.8,
      pass_at_k: 0.75,
      pass_pow_k: 0.6,
      trials: [
        {
          trial_id: 1,
          reward: 0.8,
          duration_ms: 5000,
          n_commands: 3,
          input_tokens: 100,
          output_tokens: 200,
          grader_results: [
            { grader_type: 'deterministic', score: 0.8, weight: 1.0, details: 'ok' },
          ],
        },
      ],
      skills_used: ['my-skill'],
    });

    const logSpy = vi.spyOn(console, 'log');
    await runCliPreview('/results');

    const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(allOutput).toContain('test-task');
    expect(allOutput).toContain('80.0%');
    expect(allOutput).toContain('my-skill');
  });

  it('skips invalid JSON files gracefully', async () => {
    mockReaddir.mockResolvedValue(['bad.json', 'good.json'] as any);
    mockReadJSON
      .mockRejectedValueOnce(new Error('Parse error'))
      .mockResolvedValueOnce({
        task: 'good-task',
        pass_rate: 1.0,
        trials: [
          {
            trial_id: 1,
            reward: 1.0,
            duration_ms: 1000,
            n_commands: 1,
            input_tokens: 50,
            output_tokens: 100,
            grader_results: [],
          },
        ],
        skills_used: [],
      });

    const logSpy = vi.spyOn(console, 'log');
    await runCliPreview('/results');

    const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(allOutput).toContain('good-task');
  });

  it('only processes .json files', async () => {
    mockReaddir.mockResolvedValue(['report.json', 'readme.txt', 'data.csv'] as any);
    mockReadJSON.mockResolvedValue({
      task: 'task1',
      pass_rate: 0.5,
      trials: [{
        trial_id: 1, reward: 0.5, duration_ms: 1000,
        n_commands: 1, input_tokens: 10, output_tokens: 20,
        grader_results: [],
      }],
      skills_used: [],
    });

    await runCliPreview('/results');

    // readJSON should only be called once (for the .json file)
    expect(mockReadJSON).toHaveBeenCalledTimes(1);
  });

  it('displays LLM grader details', async () => {
    mockReaddir.mockResolvedValue(['test.json'] as any);
    mockReadJSON.mockResolvedValue({
      task: 'task1',
      pass_rate: 0.9,
      trials: [{
        trial_id: 1,
        reward: 0.9,
        duration_ms: 2000,
        n_commands: 2,
        input_tokens: 100,
        output_tokens: 200,
        grader_results: [
          { grader_type: 'llm_rubric', score: 0.9, weight: 1.0, details: 'Excellent work' },
        ],
      }],
      skills_used: [],
    });

    const logSpy = vi.spyOn(console, 'log');
    await runCliPreview('/results');

    const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(allOutput).toContain('llm_rubric');
    expect(allOutput).toContain('Excellent work');
  });
});
