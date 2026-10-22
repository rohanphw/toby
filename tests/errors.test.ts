import { expect, test } from 'bun:test';
import { publicError } from '../src/shared/errors';

test('errors never expose unknown tool identifiers, protocol objects or provider stacks', () => {
  for (const value of [new Error('mcp__calendar__delete_event failed: {"rawInput":{}}'), {message:'{"jsonrpc":"2.0","error":{"code":-32603}}'}, {secret:'token'}, new Error('Failure\n at executeTool (harness.ts:50)')]) {
    expect(publicError(value)).toBe('Toby couldn’t complete this action. Please try again.');
  }
});

test('known failures explain recovery and remain readable across main and renderer boundaries', () => {
  for (const [input,expected] of [
    ['EACCES: open /private/report','Toby doesn’t have access to this item. Check its permissions and try again.'],
    ['session/prompt timed out','This took too long to respond. Please try again.'],
    ['429 quota exceeded','Your provider’s usage limit has been reached. Wait a while or choose another connected model.'],
    ['Command declined','You declined this action. Nothing was run.'],
    ['Runtime checksum verification failed','The downloaded app component could not be verified. Retry the download.'],
  ]) {expect(publicError(new Error(input))).toBe(expected);expect(publicError(publicError(input))).toBe(expected);}
  expect(publicError(new Error("Error invoking remote method 'toby:invoke': Error: Enter a memory"))).toBe('Enter a memory');
});
