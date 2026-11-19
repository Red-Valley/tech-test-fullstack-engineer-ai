import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from '@/lib/auth';
import type { CreateGameInput } from '@/types/game';
import type { CreateUserInput } from '@/types/user';

export const SEED_USERS: CreateUserInput[] = [
    {
        name: 'John Doe',
        email: 'john.doe@indiegames.ai',
        password: 'importantpassword',
        role: 'admin',
    },
];

export const SEED_GAMES: CreateGameInput[] = [
    {
        title: 'Hollow Knight: Silksong',
        developer: 'Team Cherry',
        genre: 'Metroidvania',
        description:
            'Play as Hornet, princess-protector of Hallownest, and explore a vast haunted kingdom of silk and song with acrobatic combat.',
        monthly_revenue_usd: 485000,
        monthly_downloads: 34200,
        average_rating: 4.9,
    },
    {
        title: 'Balatro',
        developer: 'LocalThunk',
        genre: 'Roguelike Deckbuilder',
        description:
            'A hypnotic poker-inspired roguelike deckbuilder where illegal poker hands, wild jokers, and escalating blinds create explosive combos.',
        monthly_revenue_usd: 612000,
        monthly_downloads: 51800,
        average_rating: 4.85,
    },
    {
        title: 'Hades II',
        developer: 'Supergiant Games',
        genre: 'Roguelike',
        description:
            'Battle beyond the Underworld using dark sorcery as Melinoë, Princess of the Underworld, in a mythic sequel to the award-winning dungeon crawler.',
        monthly_revenue_usd: 740000,
        monthly_downloads: 46500,
        average_rating: 4.92,
    },
    {
        title: 'Celeste',
        developer: 'Maddy Makes Games',
        genre: 'Platformer',
        description:
            'Help Madeline survive her inner demons on her journey to the top of Celeste Mountain in a tight, hand-crafted precision platformer.',
        monthly_revenue_usd: 94500,
        monthly_downloads: 18400,
        average_rating: 4.88,
    },
    {
        title: 'Stardew Valley',
        developer: 'ConcernedApe',
        genre: 'Farming Sim',
        description:
            'Inherit your grandfather’s overgrown farm plot in Pelican Town, raise crops and animals, mine caverns, and build a new life.',
        monthly_revenue_usd: 530000,
        monthly_downloads: 64200,
        average_rating: 4.95,
    },
    {
        title: 'Vampire Survivors',
        developer: 'poncle',
        genre: 'Bullet Heaven',
        description:
            'Mow down thousands of night creatures and survive until dawn in a minimalist gothic horror roguelite with auto-firing weapon evolutions.',
        monthly_revenue_usd: 185000,
        monthly_downloads: 92000,
        average_rating: 4.76,
    },
    {
        title: 'Slay the Spire',
        developer: 'Mega Crit',
        genre: 'Roguelike Deckbuilder',
        description:
            'Craft a unique deck, encounter bizarre creatures, and discover relics of immense power as you climb an ever-changing spire.',
        monthly_revenue_usd: 215000,
        monthly_downloads: 29500,
        average_rating: 4.82,
    },
    {
        title: 'Outer Wilds',
        developer: 'Mobius Digital',
        genre: 'Exploration',
        description:
            'An open-world mystery about a solar system trapped in an endless 22-minute time loop, driven purely by curiosity and discovery.',
        monthly_revenue_usd: 142000,
        monthly_downloads: 14800,
        average_rating: 4.91,
    },
    {
        title: 'DREDGE',
        developer: 'Black Salt Games',
        genre: 'Adventure',
        description:
            'Captain a fishing trawler across remote islands, sell your catch, upgrade your boat, and uncover eldritch secrets lurking in the deep.',
        monthly_revenue_usd: 164000,
        monthly_downloads: 19200,
        average_rating: 4.55,
    },
    {
        title: 'Sea of Stars',
        developer: 'Sabotage Studio',
        genre: 'RPG',
        description:
            'A turn-based retro RPG following two Children of the Solstice who combine the powers of the sun and moon to perform Eclipse Magic.',
        monthly_revenue_usd: 178000,
        monthly_downloads: 16400,
        average_rating: 4.32,
    },
    {
        title: 'Tunic',
        developer: 'ISOMETRICORP Games',
        genre: 'Action Adventure',
        description:
            'Explore a ruined land full of lost legends, ancient powers, and fierce monsters as a tiny fox armed with a cryptic instruction manual.',
        monthly_revenue_usd: 98000,
        monthly_downloads: 11200,
        average_rating: 4.64,
    },
    {
        title: 'Neon White',
        developer: 'Angel Matrix',
        genre: 'Platformer',
        description:
            'A lightning-fast first-person action game about exterminating demons in Heaven using Soul Cards for movement and attacks.',
        monthly_revenue_usd: 82000,
        monthly_downloads: 9800,
        average_rating: 4.48,
    },
    {
        title: 'Signalis',
        developer: 'rose-engine',
        genre: 'Survival Horror',
        description:
            'A classic survival horror experience set in a dystopian future where Replika technician Elster searches for her lost partner.',
        monthly_revenue_usd: 74500,
        monthly_downloads: 8900,
        average_rating: 4.72,
    },
    {
        title: 'Rollerdrome',
        developer: 'Roll7',
        genre: 'Action',
        description:
            'A single-player third-person shooter-skater hybrid blending fluid trick-based movement with intense slow-motion gunplay.',
        monthly_revenue_usd: 41200,
        monthly_downloads: 6300,
        average_rating: 3.85,
    },
    {
        title: 'Backpack Hero',
        developer: 'Jaspel',
        genre: 'Roguelike',
        description:
            'An inventory-management roguelike where how you arrange items in your backpack directly determines their combat synergies.',
        monthly_revenue_usd: 58900,
        monthly_downloads: 12100,
        average_rating: 3.92,
    },
    {
        title: 'Loop Hero',
        developer: 'Four Quarters',
        genre: 'Strategy',
        description:
            'Place enemies, buildings, and terrain along a procedural expedition loop to equip your hero and break the Lich’s timeless cycle.',
        monthly_revenue_usd: 67400,
        monthly_downloads: 15400,
        average_rating: 4.18,
    },
    {
        title: 'Cuphead',
        developer: 'Studio MDHR',
        genre: 'Platformer',
        description:
            'A classic run-and-gun action game heavily focused on boss battles, hand-drawn in 1930s cartoon cel animation with a live jazz score.',
        monthly_revenue_usd: 175000,
        monthly_downloads: 26000,
        average_rating: 4.72,
    },
    {
        title: 'Dead Cells',
        developer: 'Motion Twin',
        genre: 'Roguelike',
        description:
            'A roguevania action platformer featuring interconnected castle levels, crisp 2D combat, and hundreds of weapons and mutations.',
        monthly_revenue_usd: 228000,
        monthly_downloads: 38900,
        average_rating: 4.79,
    },
    {
        title: 'Disco Elysium',
        developer: 'ZA/UM',
        genre: 'RPG',
        description:
            'A groundbreaking detective RPG where an amnesiac officer interrogates suspects, wrestles with 24 inner voices, and shapes a fractured city.',
        monthly_revenue_usd: 290000,
        monthly_downloads: 24100,
        average_rating: 4.91,
    },
    {
        title: 'Factorio',
        developer: 'Wube Software',
        genre: 'Strategy',
        description:
            'Build and maintain automated factories, mine resources, research technologies, and defend your sprawling production lines from native biters.',
        monthly_revenue_usd: 510000,
        monthly_downloads: 27400,
        average_rating: 4.93,
    },
    {
        title: 'Inscryption',
        developer: 'Daniel Mullins Games',
        genre: 'Roguelike Deckbuilder',
        description:
            'An inky black card-based odyssey blending deckbuilding roguelike, escape-room puzzles, and psychological horror.',
        monthly_revenue_usd: 158000,
        monthly_downloads: 22500,
        average_rating: 4.77,
    },
    {
        title: 'Into the Breach',
        developer: 'Subset Games',
        genre: 'Strategy',
        description:
            'Control powerful mechs from the future in tight turn-based tactical skirmishes to repel an alien threat across destructible grids.',
        monthly_revenue_usd: 89000,
        monthly_downloads: 16200,
        average_rating: 4.68,
    },
    {
        title: 'Katana ZERO',
        developer: 'Askiisoft',
        genre: 'Action',
        description:
            'A neo-noir action platformer with instant-death combat, bullet deflection, and time-manipulation mechanics.',
        monthly_revenue_usd: 76000,
        monthly_downloads: 14900,
        average_rating: 4.64,
    },
    {
        title: 'Ori and the Will of the Wisps',
        developer: 'Moon Studios',
        genre: 'Metroidvania',
        description:
            'Embark on an emotional journey across a vast, hand-painted forest filled with fluid platforming, spirit weapons, and towering bosses.',
        monthly_revenue_usd: 245000,
        monthly_downloads: 31200,
        average_rating: 4.86,
    },
    {
        title: 'Risk of Rain 2',
        developer: 'Hopoo Games',
        genre: 'Roguelike',
        description:
            'Escape a chaotic alien planet by fighting through hordes of frenzied monsters, stacking wild item synergies alone or in co-op.',
        monthly_revenue_usd: 340000,
        monthly_downloads: 54000,
        average_rating: 4.81,
    },
    {
        title: 'Subnautica',
        developer: 'Unknown Worlds',
        genre: 'Survival',
        description:
            'Descend into the depths of an alien underwater world, craft submarines, manage oxygen, and uncover the mystery of Planet 4546B.',
        monthly_revenue_usd: 315000,
        monthly_downloads: 41500,
        average_rating: 4.84,
    },
    {
        title: 'Terraria',
        developer: 'Re-Logic',
        genre: 'Survival',
        description:
            'Dig, fight, explore, and build in a procedurally generated 2D sandbox packed with biomes, crafting, and colossal bosses.',
        monthly_revenue_usd: 620000,
        monthly_downloads: 115000,
        average_rating: 4.9,
    },
    {
        title: 'Tunic',
        developer: 'Isometricorp Games',
        genre: 'Adventure',
        description:
            'Explore a hostile land as a tiny fox in an isometric action-adventure, piecing together an illustrated instruction manual page by page.',
        monthly_revenue_usd: 112000,
        monthly_downloads: 15800,
        average_rating: 4.61,
    },
];

const SCHEMA_VERSION = 3;

const globalForDb = globalThis as unknown as {
    __gamesDb?: DatabaseSync;
    __gamesDbSchemaVersion?: number;
};

export function initializeSchema(db: DatabaseSync, seed = true): void {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      developer TEXT NOT NULL,
      genre TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      monthly_revenue_usd REAL NOT NULL DEFAULT 0,
      monthly_downloads INTEGER NOT NULL DEFAULT 0,
      average_rating REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
    CREATE INDEX IF NOT EXISTS idx_games_rating ON games(average_rating);
    CREATE INDEX IF NOT EXISTS idx_games_revenue ON games(monthly_revenue_usd);
  `);

    const columns = db.prepare('PRAGMA table_info(games)').all() as Array<{ name: string }>;
    const hasDescription = columns.some((col) => col.name === 'description');
    if (!hasDescription) {
        db.exec("ALTER TABLE games ADD COLUMN description TEXT NOT NULL DEFAULT '';");
    }

    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

    if (!seed) return;

    const userRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as {
        count: number;
    };
    if (userRow.count === 0) {
        const insertUser = db.prepare(`
      INSERT INTO users (
        name, email, password_hash, role
      ) VALUES (
        :name, :email, :password_hash, :role
      )
    `);
        db.exec('BEGIN');
        try {
            for (const user of SEED_USERS) {
                insertUser.run({
                    name: user.name,
                    email: user.email.toLowerCase(),
                    password_hash: hashPassword(user.password),
                    role: user.role ?? 'member',
                });
            }
            db.exec('COMMIT');
        } catch (err) {
            db.exec('ROLLBACK');
            throw err;
        }
    }

    const row = db.prepare('SELECT COUNT(*) as count FROM games').get() as {
        count: number;
    };
    if (row.count === 0) {
        const insert = db.prepare(`
      INSERT INTO games (
        title, developer, genre, description, monthly_revenue_usd, monthly_downloads, average_rating
      ) VALUES (
        :title, :developer, :genre, :description, :monthly_revenue_usd, :monthly_downloads, :average_rating
      )
    `);
        db.exec('BEGIN');
        try {
            for (const item of SEED_GAMES) {
                insert.run({
                    title: item.title,
                    developer: item.developer,
                    genre: item.genre,
                    description: item.description ?? '',
                    monthly_revenue_usd: item.monthly_revenue_usd,
                    monthly_downloads: item.monthly_downloads,
                    average_rating: item.average_rating,
                });
            }
            db.exec('COMMIT');
        } catch (err) {
            db.exec('ROLLBACK');
            throw err;
        }
    } else {
        if (!hasDescription) {
            const backfill = db.prepare(
                "UPDATE games SET description = :description WHERE title = :title AND description = ''",
            );
            db.exec('BEGIN');
            try {
                for (const item of SEED_GAMES) {
                    backfill.run({
                        title: item.title,
                        description: item.description ?? '',
                    });
                }
                db.exec('COMMIT');
            } catch (err) {
                db.exec('ROLLBACK');
                throw err;
            }
        }

        // Seed any newly added catalog titles into an existing database without duplicating
        const insertIfMissing = db.prepare(`
      INSERT INTO games (
        title, developer, genre, description, monthly_revenue_usd, monthly_downloads, average_rating
      )
      SELECT :title, :developer, :genre, :description, :monthly_revenue_usd, :monthly_downloads, :average_rating
      WHERE NOT EXISTS (SELECT 1 FROM games WHERE title = :title)
    `);
        db.exec('BEGIN');
        try {
            for (const item of SEED_GAMES) {
                insertIfMissing.run({
                    title: item.title,
                    developer: item.developer,
                    genre: item.genre,
                    description: item.description ?? '',
                    monthly_revenue_usd: item.monthly_revenue_usd,
                    monthly_downloads: item.monthly_downloads,
                    average_rating: item.average_rating,
                });
            }
            db.exec('COMMIT');
        } catch (err) {
            db.exec('ROLLBACK');
            throw err;
        }
    }
}

export function getDb(): DatabaseSync {
    if (globalForDb.__gamesDb) {
        if (globalForDb.__gamesDbSchemaVersion !== SCHEMA_VERSION) {
            initializeSchema(globalForDb.__gamesDb, true);
            globalForDb.__gamesDbSchemaVersion = SCHEMA_VERSION;
        }
        return globalForDb.__gamesDb;
    }

    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'games.db');

    if (dbPath !== ':memory:') {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    const db = new DatabaseSync(dbPath);
    initializeSchema(db, true);
    globalForDb.__gamesDb = db;
    globalForDb.__gamesDbSchemaVersion = SCHEMA_VERSION;
    return db;
}
