const documentoRoutes = require("./documento.routes")
const app = require("express")()

app.use("/documento", documentoRoutes)

module.exports = app
