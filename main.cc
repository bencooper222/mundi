
#include <iostream>
#include <chrono>

#include "s2/s2cell_id.h"
#include "s2/s2cell.h"
#include "s2/s2latlng.h"
#include "s2/s2latlng_rect.h"

int main()
{
    auto start = std::chrono::high_resolution_clock::now();
    // Create a cell from a token
    S2CellId cell_id = S2CellId::FromToken("89c25");
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Time taken to create cell: " << duration.count() << " microseconds\n";

    start = std::chrono::high_resolution_clock::now();
    // Get the cell
    S2Cell cell(cell_id);
    end = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Time taken to get cell: " << duration.count() << " microseconds\n";

    start = std::chrono::high_resolution_clock::now();
    // Get the cell's bounding rectangle
    S2LatLngRect bounds = cell.GetRectBound();
    end = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Time taken to get cell's bounding rectangle: " << duration.count() << " microseconds\n";

    start = std::chrono::high_resolution_clock::now();
    // Print the cell's extents
    std::cout << "Cell extents:\n";
    std::cout << "Southwest: " << bounds.lo() << "\n";
    std::cout << "Northeast: " << bounds.hi() << "\n";
    end = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    std::cout << "Time taken to print cell's extents: " << duration.count() << " microseconds\n";

    return 0;
}