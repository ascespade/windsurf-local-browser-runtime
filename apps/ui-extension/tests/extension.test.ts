import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { commands } from '../src/commands.ts';

describe('UI Extension', () => {
  describe('Command Definitions', () => {
    test('should define extension commands as data', () => {
      assert.ok(Array.isArray(commands), 'commands should be an array');
      assert.equal(commands.length, 3, 'should have 3 commands');
    });

    test('should have launchVisible browser command', () => {
      const launchCmd = commands.find(
        (c) => c.id === 'wlbr.browser.launchVisible',
      );

      assert.ok(launchCmd, 'launchVisible command should exist');
      assert.equal(launchCmd!.title, 'Launch Visible Browser Session');
      assert.ok(launchCmd!.description.length > 0);
    });

    test('should have startProject remote command', () => {
      const startCmd = commands.find(
        (c) => c.id === 'wlbr.remote.startProject',
      );

      assert.ok(startCmd, 'startProject command should exist');
      assert.equal(startCmd!.title, 'Start Remote Project Runtime');
      assert.ok(startCmd!.description.length > 0);
    });

    test('should have launchAndProbe orchestrator command', () => {
      const probeCmd = commands.find(
        (c) => c.id === 'wlbr.orchestrator.launchAndProbe',
      );

      assert.ok(probeCmd, 'launchAndProbe command should exist');
      assert.equal(probeCmd!.title, 'Launch And Probe Workspace');
      assert.ok(probeCmd!.description.length > 0);
    });

    test('should have well-structured command objects', () => {
      for (const cmd of commands) {
        assert.equal(typeof cmd.id, 'string', 'command id should be a string');
        assert.ok(
          cmd.id.startsWith('wlbr.'),
          'command id should start with wlbr.',
        );
        assert.equal(
          typeof cmd.title,
          'string',
          'command title should be a string',
        );
        assert.ok(cmd.title.length > 0, 'command title should not be empty');
        assert.equal(
          typeof cmd.description,
          'string',
          'command description should be a string',
        );
        assert.ok(
          cmd.description.length > 0,
          'command description should not be empty',
        );
      }
    });

    test('should have unique command IDs', () => {
      const ids = commands.map((c) => c.id);
      const uniqueIds = new Set(ids);
      assert.equal(
        ids.length,
        uniqueIds.size,
        'all command IDs should be unique',
      );
    });

    test('commands should cover all three subsystems', () => {
      const hasBrowser = commands.some((c) => c.id.startsWith('wlbr.browser.'));
      const hasRemote = commands.some((c) => c.id.startsWith('wlbr.remote.'));
      const hasOrchestrator = commands.some((c) =>
        c.id.startsWith('wlbr.orchestrator.'),
      );

      assert.ok(hasBrowser, 'should have a browser command');
      assert.ok(hasRemote, 'should have a remote command');
      assert.ok(hasOrchestrator, 'should have an orchestrator command');
    });
  });
});
