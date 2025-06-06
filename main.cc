#include <emscripten.h>
#include <emscripten/bind.h>

#include "s2/s2cell_id.h"
#include "s2/s2cell.h"
#include "s2/s2latlng.h"
#include "s2/s2latlng_rect.h"

using namespace emscripten;

struct LatLng
{
    double lat;
    double lng;
};
struct S2CellInfo
{
    std::string id;
    LatLng low;
    LatLng high;
    double approximate_area;
    int zoom_level;
};

S2CellInfo GetCellInfo(const std::string token)
{
    auto cell_id = S2CellId::FromToken(token);
    S2Cell cell(cell_id);
    S2LatLngRect bounds = cell.GetRectBound();

    S2CellInfo cell_info;
    cell_info.id = token;

    auto lo_bounds = bounds.lo();
    auto hi_bounds = bounds.hi();

    cell_info.low.lat = lo_bounds.lat().degrees();
    cell_info.low.lng = lo_bounds.lng().degrees();
    cell_info.high.lat = hi_bounds.lat().degrees();
    cell_info.high.lng = hi_bounds.lng().degrees();

    cell_info.approximate_area = cell.ApproxArea();
    cell_info.zoom_level = cell.level(); 

    return cell_info;
}

EMSCRIPTEN_BINDINGS(get_cell_info)
{
    value_object<LatLng>("LatLng")
        .field("lat", &LatLng::lat)
        .field("lng", &LatLng::lng);

    value_object<S2CellInfo>("S2CellInfo")
        .field("id", &S2CellInfo::id)
        .field("low", &S2CellInfo::low)
        .field("high", &S2CellInfo::high)
        .field("approximateArea", &S2CellInfo::approximate_area)
        .field("zoomLevel", &S2CellInfo::zoom_level);

    function("GetCellInfo", &GetCellInfo);
}