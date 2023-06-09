import React, {useCallback, useState, useRef} from 'react'
import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import Cell from '../cell/Cell';
import DropdownButton from '../dropdown/DropdownButton';

// Helpers
import { 
    DEFAULT_HEIGHT, 
    DEFAULT_WIDTH, 
    algoDescriptions, 
    createGrid, 
    clearPath, 
    clearGrid, 
    runAlgorithm 
} from './helpers'

// Icons.
import {ReactComponent as PlayButton} from '../../assets/icons/play-solid.svg' 

export default function PathfindingVisualiser() {
    const [grid, setGrid] = useState(createGrid(DEFAULT_HEIGHT, DEFAULT_WIDTH));
    const isMousePressed = useRef(false); // Changing refs won't trigger re-render.
    const isVisualising = useRef(false);
    const [selectedCellType, setSelectedCellType] = useState("wall");
    const [selectedAlgorithm, setSelectedAlgorithm] = useState("Select Algorithm");

    // Initial start and goal coords.
    const startCell = useRef({
        row: 5, 
        col: 5,
    });
    const goalCell = useRef({
        row: DEFAULT_HEIGHT - 5,
        col: DEFAULT_WIDTH - 5,
    });

    /* MOUSE EVENTS -------------------------------------------------------------------- */

    /* NOTE:
    useCallback caches a function between re-renders until its dependencies change. 
    If the dependencies list is empty, then we essentially don't have depencies, and
    thus on each re-render, the useCallback hook should return the same function
    REFERENCE each time.

    This is needed because anonymous functions (the one where we don't use useCallback),
    will always get a new function reference on every render (the function reference 
    changes), which will make memo() unable to work optimally for each cell.
    */
    
    // An updater function that updates a specific cell in the state grid. This is required
    // becuase if we try to update the cell inside the handler functions, we have to include
    // the grid as a dependency in the useCallBack hook. This breaks the memoisation for 
    // rendering each cell.
    const toggleCellType = useCallback((row, col) => {
        setGrid((prevGrid) => {
            const newGrid = prevGrid.slice();
            
            // Only one start and goal cells should exist, so we remove the previous start/goal
            // when updating their positions. 
            if (selectedCellType === "start") {
                newGrid[startCell.current.row][startCell.current.col].cellType = undefined;
                newGrid[startCell.current.row][startCell.current.col].traversalState = "unvisited";

                // Update coords of start cell.
                startCell.current = {
                    row,
                    col,
                };
            } else if (selectedCellType === "goal") {
                newGrid[goalCell.current.row][goalCell.current.col].cellType = undefined;
                newGrid[goalCell.current.row][goalCell.current.col].traversalState = "unvisited";

                // Update coords of goal cell.
                goalCell.current = {
                    row,
                    col,
                };
            }
            // Our selected cell is not a start/goal cell. Thus, we also cannot add the selected
            // cell onto a start/goal cell.

            let currCellType = newGrid[row][col].cellType;
            if (currCellType !== "start" && currCellType !== "goal") {
                newGrid[row][col].cellType = selectedCellType;
            }

            return newGrid;
        });
    }, [selectedCellType]);


    // ASYNC NOTE: We used an aync function since the toggleCellType could take some time to execute.
    // We need to ensure the toggleCellType() function occurs before updating the refs for start
    // and goal because we need to use the OLD values of those refs inside the toggleCellType()
    // function.
    //      Is there a better way? - IDK

    const handleMouseDown = useCallback((e, row, col) => {
        if (isVisualising.current === true) {
            return
        }

        e.preventDefault() // Prevents default dragging.
        isMousePressed.current = true;

        // Toggle the cell type. We use await to ensure this function executes before the below code.
        toggleCellType(row, col);

        // Update coords of where the new start/goal cell is, since we can only have 1 of each on
        // the board at any given time. - We do this inside the updater function above (toggleCellType).

    }, [toggleCellType]);

    const handleMouseUp = useCallback(() => {
        isMousePressed.current = false;
    }, []);

    const handleMouseEnter = useCallback(async (row, col) => {
        if (isMousePressed.current) {
            // Toggle the cell.
            toggleCellType(row, col);
        }
    }, [toggleCellType]);

    /* GRID EVENTS -------------------------------------------------------------------- */

    const updateTraversalState = (cell, state) => {
        setGrid((prevGrid) => {
            const newGrid = prevGrid.slice();
            newGrid[cell.row][cell.col].traversalState = state;
            return newGrid;
        });
    };

    const handlePlayAlgorithm = () => {
        // Cannot visualise another algorithm while it is still running.
        if (isVisualising.current === true) {
            return
        }

        // Check if no algorithm selected.
        if (selectedAlgorithm === "Select Algorithm") {
            alert("Choose an Algorithm!")
            return
        }

        // Clear path before visualising.
        handleClearPath();
        
        isVisualising.current = true;

        // For now we just run BFS.
        const { visitedCellsInOrder, path } = runAlgorithm(selectedAlgorithm, grid, startCell.current, goalCell.current);

        animateAlgorithm(visitedCellsInOrder, path);

    };

    /**
     * Animate the visited cells in order and then the path.
     */
    const animateAlgorithm = (visitedCellsInOrder, path) => {
        const speed = 40;

        // Animate the visited nodes.
        let delay = 0;
        for (let i = 0; i < visitedCellsInOrder.length; i++) {
            // Every 20ms we schedule a node to be visited.
            let currCell = visitedCellsInOrder[i];
            setTimeout(() => {
                updateTraversalState(currCell, "visited");

                // If we didn't find a path, then after all nodes are visited, we can edit the 
                // board again.
                if (i === visitedCellsInOrder.length - 1 && path.length === 0) {
                    isVisualising.current = false;
                }
            }, speed * i);
            delay += speed;
        }

        // Visualise the path after the nodes have been visited (hence why we delay it with setTimeout).
        setTimeout(() => {
            for (let i = 0; i < path.length; i++) {
                let currCell = path[i];
                setTimeout(() => {
                    updateTraversalState(currCell, "path")

                    // After all the nodes are traversed, we can edit the board again.
                    if (i === path.length - 1) {
                        isVisualising.current = false;
                    }
                }, speed * i);
            }
        }, delay);
    };

    /* CLEAR EVENTS -------------------------------------------------------------------- */

    const handleClearPath = () => {
        if (isVisualising.current === true) {
            return
        }
        setGrid((prevGrid) => {
            return clearPath(prevGrid);
        });
    };

    const handleClearGrid = () => {
        if (isVisualising.current === true) {
            return
        }
        setGrid((prevGrid) => {
            return clearGrid(prevGrid);
        });
    };

    /* OPTION EVENTS -------------------------------------------------------------------- */

    const handleChangeAlgorithm = (algorithm) => {
        // Change the selected algorithm.
        setSelectedAlgorithm(algorithm);
    }

    const handleChangeCellType = (cellType) => {
        setSelectedCellType(cellType);
    }

    return (
        <div className='pathfinding-visualiser'>
            {/* Header Section */}
            <Header />

            {/* Sidebar Section */}
            <Sidebar handleChangeCellType={handleChangeCellType} selectedItem={selectedCellType} />

            <main>
                {/* Top Description Section */}
                <section className='algo-desc'>
                    <div className='algo-info'>
                        <h2>{selectedAlgorithm}</h2>
                        <p>
                            {algoDescriptions[selectedAlgorithm]}
                        </p>
                    </div>
                    <div className='divider'></div>
                    
                    {/* Algorithm Select Button */}
                    <DropdownButton selectedAlgorithm={selectedAlgorithm} handleChangeAlgorithm={handleChangeAlgorithm} />

                    {/* Play Button */}
                    <button className='algo-play' onClick={handlePlayAlgorithm}>
                        <PlayButton className='play-svg'/>
                    </button>
                </section>

                {/* Grid Section */}
                <div className='grid'>
                    {grid.map((row) => {
                        return (
                            row.map((cell, cellIdx) => {
                                const { row, col, cellType, traversalState } = cell;
                                return (
                                    <Cell
                                        key={cellIdx}
                                        row={row}
                                        col={col}
                                        cellType={cellType}
                                        traversalState={traversalState}
                                        onMouseDown={handleMouseDown}
                                        onMouseUp={handleMouseUp}
                                        onMouseEnter={handleMouseEnter}
                                    />
                                )
                            })
                        )
                    })}
                </div>

                {/* Clear Section */}
                <section className='clear-section'>
                    <button className='btn-clear-path' onMouseDown={handleClearPath}>
                        <span>Clear Path</span>
                    </button>

                    <button className='btn-clear-grid' onMouseDown={handleClearGrid}>
                        <span>Clear Grid</span>
                    </button>
                </section>

            </main>

        </div>
    )
}
