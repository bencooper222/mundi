const a = require("./s2_library");

a["onRuntimeInitialized"] = () => {
  console.log(a.GetCellInfo("2ef59c"));
};
