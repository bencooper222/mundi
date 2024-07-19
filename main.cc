
#include <iostream>
#include "s2/s2cell_id.h"
#include "s2/s2cell.h"
#include "s2/s2latlng.h"
#include "s2/s2latlng_rect.h"

int main()
{
    // Create a cell from a token
    S2CellId cell_id = S2CellId::FromToken("89c25");

    // Get the cell
    S2Cell cell(cell_id);

    // Get the cell's bounding rectangle
    S2LatLngRect bounds = cell.GetRectBound();

    // Print the cell's extents
    std::cout << "Cell extents:\n";
    std::cout << "Southwest: " << bounds.lo() << "\n";
    std::cout << "Northeast: " << bounds.hi() << "\n";

    return 0;
}