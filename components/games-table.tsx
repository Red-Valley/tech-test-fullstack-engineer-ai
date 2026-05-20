'use client';

import type { ReactElement } from 'react';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCount, formatRating, formatUSD } from '@/lib/formatters';
import type { Game } from '@/lib/games/schema';

const COLUMN_COUNT = 7;
const SKELETON_ROWS = 5;

export interface GamesTableProps {
  games: Game[];
  loading: boolean;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

export function GamesTable({
  games,
  loading,
  onEdit,
  onDelete,
}: GamesTableProps): ReactElement {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Developer</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Downloads</TableHead>
            <TableHead className="text-right">Rating</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">{game.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {game.developer}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{game.genre}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(game.monthly_revenue_usd)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCount(game.monthly_downloads)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Star
                        className="size-3.5 text-amber-500"
                        aria-hidden="true"
                      />
                      {formatRating(game.average_rating)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(game)}
                        aria-label={`Edit ${game.title}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(game)}
                        aria-label={`Delete ${game.title}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
