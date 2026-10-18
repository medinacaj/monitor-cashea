import test from 'node:test';
import assert from 'node:assert/strict';
import { corroborarSitio } from '../scripts/status-core.mjs';

const now = Date.parse('2026-10-18T12:00:00Z');
const signal = (provider,state,t='2026-10-18T11:57:00Z') => ({provider,state,t,authorized:true});

test('una sola red nunca publica estado global', () => {
  assert.equal(corroborarSitio([signal('actions','up')], now).verdict, 'insufficient');
  assert.equal(corroborarSitio([signal('actions','down'),signal('actions','down')], now).providers, 1);
});

test('dos proveedores independientes y coincidentes sí corroboran web', () => {
  assert.equal(corroborarSitio([signal('actions','up'),signal('external','up')], now).verdict,'responding');
  assert.equal(corroborarSitio([signal('actions','down'),signal('external','down')], now).verdict,'unresponsive');
});

test('bloqueos, contradicciones, antigüedad y fuentes no autorizadas no corroboran', () => {
  assert.equal(corroborarSitio([signal('a','up'),signal('b','down')],now).verdict,'insufficient');
  assert.equal(corroborarSitio([signal('a','up'),signal('b','restricted')],now).verdict,'insufficient');
  assert.equal(corroborarSitio([signal('a','up'),signal('b','up','2026-10-18T10:00:00Z')],now).verdict,'insufficient');
  assert.equal(corroborarSitio([signal('a','up'),{...signal('b','up'),authorized:false}],now).verdict,'insufficient');
});
