import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { closeDatabase, getDatabase } from '../src/lib/db.js';
import { seedDatabase } from '../src/lib/seed.js';
import { GET as getGames, POST as createGame } from '../src/app/api/games/route.js';
import {
  GET as getGameById,
  PATCH as updateGame,
  DELETE as deleteGame,
} from '../src/app/api/games/[id]/route.js';
import { GET as getCatalogStatsRoute } from '../src/app/api/games/stats/route.js';

describe('REST API Routes - Integration Tests', () => {
  before(() => {
    // Enforce isolated in-memory database for API integration tests
    process.env.GAMES_DB_PATH = ':memory:';
    // Initialize the isolated in-memory DB and seed
    const db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    const db = getDatabase();
    closeDatabase(db);
    delete process.env.GAMES_DB_PATH;
  });

  it('R2.1 / GET /api/games: returns 200 and list of seeded games with total count', async () => {
    const req = new NextRequest('http://localhost:3000/api/games');
    const res = await getGames(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.total, 15);
    assert.ok(Array.isArray(json.data));
    assert.equal(json.data.length, 15);
  });

  it('R2.1 / GET /api/games?search=Celeste: filters games by search term', async () => {
    const req = new NextRequest('http://localhost:3000/api/games?search=Celeste');
    const res = await getGames(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].title, 'Celeste');
  });

  it('R2.1 / GET /api/games?genre=Roguelike: filters games by genre', async () => {
    const req = new NextRequest('http://localhost:3000/api/games?genre=Roguelike');
    const res = await getGames(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    // Dead Cells and Hades are both Roguelikes in seed data
    assert.equal(json.data.length, 2);
    const titles = json.data.map((g: { title: string }) => g.title);
    assert.ok(titles.includes('Dead Cells'));
    assert.ok(titles.includes('Hades'));
  });

  it('R2.1 / GET /api/games?limit=3&offset=0: handles pagination correctly', async () => {
    const req = new NextRequest('http://localhost:3000/api/games?limit=3&offset=0');
    const res = await getGames(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 3);
    assert.equal(json.total, 15);
  });

  it('R2.1 / POST /api/games: creates a valid game and returns 201 Created', async () => {
    const newGamePayload = {
      title: 'Braid Anniversary Edition',
      developer: 'Thekla, Inc.',
      genre: 'Puzzle Platformer',
      monthly_revenue_usd: 210000,
      monthly_downloads: 65000,
      average_rating: 4.5,
    };

    const req = new NextRequest('http://localhost:3000/api/games', {
      method: 'POST',
      body: JSON.stringify(newGamePayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await createGame(req);
    assert.equal(res.status, 201);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id);
    assert.equal(json.data.title, 'Braid Anniversary Edition');
    assert.equal(json.data.monthly_revenue_usd, 210000);
    assert.equal(json.data.average_rating, 4.5);
  });

  it('POST /api/games: returns 400 Bad Request when validation fails', async () => {
    // Missing developer, negative revenue, rating > 5.0
    const invalidPayload = {
      title: 'Broken Game',
      genre: 'Bug',
      monthly_revenue_usd: -50,
      monthly_downloads: 10,
      average_rating: 6.2,
    };

    const req = new NextRequest('http://localhost:3000/api/games', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await createGame(req);
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.details);
    assert.ok(json.details.length >= 2, 'Should report missing developer, negative revenue, rating > 5');
  });

  it('R2.1 / GET /api/games/[id]: returns 200 and game details for valid ID', async () => {
    // Celeste's seeded ID
    const celesteId = '11111111-1111-4111-8111-111111111101';
    const req = new NextRequest(`http://localhost:3000/api/games/${celesteId}`);
    const res = await getGameById(req, { params: Promise.resolve({ id: celesteId }) });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.title, 'Celeste');
    assert.equal(json.data.developer, 'Maddy Makes Games');
  });

  it('GET /api/games/[id]: returns 404 Not Found for non-existent ID', async () => {
    const missingId = '99999999-9999-9999-9999-999999999999';
    const req = new NextRequest(`http://localhost:3000/api/games/${missingId}`);
    const res = await getGameById(req, { params: Promise.resolve({ id: missingId }) });
    assert.equal(res.status, 404);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('not found'));
  });

  it('R2.1 / PATCH /api/games/[id]: partially updates game and returns 200', async () => {
    const celesteId = '11111111-1111-4111-8111-111111111101';
    const updatePayload = {
      monthly_revenue_usd: 1300000,
      monthly_downloads: 340000,
    };

    const req = new NextRequest(`http://localhost:3000/api/games/${celesteId}`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await updateGame(req, { params: Promise.resolve({ id: celesteId }) });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.monthly_revenue_usd, 1300000);
    assert.equal(json.data.monthly_downloads, 340000);
    assert.equal(json.data.title, 'Celeste', 'Unmutated fields remain unchanged');
  });

  it('PATCH /api/games/[id]: returns 400 when update payload has invalid values', async () => {
    const celesteId = '11111111-1111-4111-8111-111111111101';
    const req = new NextRequest(`http://localhost:3000/api/games/${celesteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ average_rating: -1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await updateGame(req, { params: Promise.resolve({ id: celesteId }) });
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.success, false);
  });

  it('R2.1 / DELETE /api/games/[id]: deletes game and returns 200, subsequent GET returns 404', async () => {
    // Create an ephemeral game to delete
    const createReq = new NextRequest('http://localhost:3000/api/games', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Game to Delete',
        developer: 'Dev',
        genre: 'Genre',
        monthly_revenue_usd: 1000,
        monthly_downloads: 100,
        average_rating: 3.5,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const createdRes = await createGame(createReq);
    const createdJson = await createdRes.json();
    const gameId = createdJson.data.id;

    // Delete it
    const deleteReq = new NextRequest(`http://localhost:3000/api/games/${gameId}`, {
      method: 'DELETE',
    });
    const deleteRes = await deleteGame(deleteReq, { params: Promise.resolve({ id: gameId }) });
    assert.equal(deleteRes.status, 200);

    const deleteJson = await deleteRes.json();
    assert.equal(deleteJson.success, true);

    // Verify subsequent GET returns 404
    const getReq = new NextRequest(`http://localhost:3000/api/games/${gameId}`);
    const getRes = await getGameById(getReq, { params: Promise.resolve({ id: gameId }) });
    assert.equal(getRes.status, 404);
  });

  it('DELETE /api/games/[id]: returns 404 when attempting to delete non-existent game', async () => {
    const missingId = '88888888-8888-8888-8888-888888888888';
    const deleteReq = new NextRequest(`http://localhost:3000/api/games/${missingId}`, {
      method: 'DELETE',
    });
    const deleteRes = await deleteGame(deleteReq, { params: Promise.resolve({ id: missingId }) });
    assert.equal(deleteRes.status, 404);
  });

  it('GET /api/games/stats: returns 200 with accurate catalog-wide stats matching the database', async () => {
    const res = await getCatalogStatsRoute();
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.total_games >= 15);
    assert.ok(json.data.total_monthly_revenue_usd > 5000000);
    assert.ok(json.data.average_rating >= 4.0 && json.data.average_rating <= 5.0);
    assert.ok(json.data.top_earner);
    assert.equal(json.data.top_earner.title, 'Celeste');
    assert.equal(json.data.top_earner.monthly_revenue_usd, 1300000);
    assert.ok(Array.isArray(json.data.genre_breakdown));
    assert.ok(json.data.genre_breakdown.length > 0);
  });
});
