# sokoban

[![make.fun](https://make.fun/bounty/sokoban-solver-01-run-20261121/badge.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121) [![make.fun](https://make.fun/bounty/sokoban-solver-01-run-20261121/badge2.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121) [![make.fun](https://make.fun/bounty/sokoban-solver-01-run-20261121/badge3.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121)

A push-optimal Sokoban solver for the make.fun bounty
sokoban-solver-01-run-20261121 ("Build the best Sokoban solver").

`main.ts` answers every level of a set in one run, writing
`solution.txt` (LURD moves) per instance. It solves each room of a level
separately with a push-optimal breadth-first search over pushes, with
dead-square and frozen 2x2 deadlock pruning, and stitches the room
solutions together with hallway walks — reaching the level's push
optimum P*.

Practice: 1,000,000 (5/5 instances at P*), ~0.85 s for the whole set,
vs the house baseline plain-astar 1.0.0 at 200,000.
