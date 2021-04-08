const app = require("express")()
const Documento = require("../models/documento.model")
const ObjectId = require("mongoose").Types.ObjectId
const utilidades = require("../utilidades/utilidades")
async function busquedaDocumentos(req) {
  return await Documento.find(obtenerBusqueda(req.query.termino))
    .select("nombre indice descripcion url")
    .exec()
}

app.get("/", async (req, res, next) => {
  try {
    req.query.termino = utilidades
      .limpiarDiacriticos(decodeURIComponent(req.query.termino))
      .trim()
    const documentos = await busquedaDocumentos(req)
    const puntos = await busquedaPuntos_palabraCompleta(req)
    const puntosTodasLasPalabrasParcial = await busquedaPuntos_todasLasPalabras(
      req
    )
    const puntosTodasLasPalabrasExacto = await busquedaPuntos_todasLasPalabrasExacto(
      req
    )
    const puntosParcial = await busquedaPuntos_parcial(req)

    //Busqueda parcial
    res.send({
      puntosTodasLasPalabrasParcial,
      puntosTodasLasPalabrasExacto,
      documentos,
      puntos,
      puntosParcial,
    })
  } catch (error) {
    next(error)
  }
})

async function busquedaPuntos_palabraCompleta(req) {
  //Busqueda palabras completas
  return await Documento.aggregate([
    {
      $project: {
        _id: 1,
        puntos: 1,
      },
    },
    separarTermino_palabraCompleta(req.query.termino),

    {
      $unwind: "$puntos",
    },

    separarTermino_palabraCompleta(req.query.termino),
    {
     $unset: "puntos._contenido"
    },
  ]).exec()
}

async function busquedaPuntos_parcial(req) {
  //Busqueda palabras parciales
  return await Documento.aggregate([
    {
      $project: {
        _id: 1,
        puntos: 1,
      },
    },
    separarTermino_coincidenciaParcial(req.query.termino),
    {
      $unwind: "$puntos",
    },
    separarTermino_coincidenciaParcial(req.query.termino),
    {
     $unset: "puntos._contenido"
    },
  ]).exec()
}

async function busquedaPuntos_todasLasPalabras(req) {
  return await Documento.aggregate([
    {
      $project: {
        _id: 1,
        puntos: 1,
      },
    },
    separarTermino_contieneTodosLosTerminos(req.query.termino),
    {
      $unwind: "$puntos",
    },
    separarTermino_contieneTodosLosTerminos(req.query.termino),
    {
     $unset: "puntos._contenido"
    },
  ]).exec()
}

async function busquedaPuntos_todasLasPalabrasExacto(req) {
  return await Documento.aggregate([
    {
      $project: {
        _id: 1,
        puntos: 1,
      },
    },
    separarTermino_contieneTodosLosTerminosExactos(req.query.termino),
    {
      $unwind: "$puntos",
    },
    separarTermino_contieneTodosLosTerminosExactos(req.query.termino),
    {
     $unset: "puntos._contenido"
    },
  ]).exec()
}

function obtenerBusqueda(termino) {
  const terminoLimpio = termino?.trim()
  if (!terminoLimpio) return {}
  const campos = ["nombre", "indice.nombre", "descripcion"]
  const busqueda = {
    $or: campos.map(x => {
      return { [x]: { $regex: terminoLimpio, $options: "gi" } }
    }),
  }
  return busqueda
}

function separarTermino_palabraCompleta(termino) {
  const d = { $match: { $or: [] } }
  const estructura = termino => {
    return {
      "puntos._contenido": {
        $regex: "(?:\\W|^)(\\Q" + termino + "\\E)(?:\\W|$)",
        $options: "i",
      },
    }
  }
  termino.split(",").forEach(x => d.$match.$or.push(estructura(x)))
  return d
}

function separarTermino_coincidenciaParcial(termino) {
  const d = { $match: { $or: [] } }
  const estructura = termino => {
    return {
      "puntos._contenido": {
        $regex: termino,
        $options: "i",
      },
    }
  }

  termino.split(",").forEach(x => d.$match.$or.push(estructura(x)))
  return d
}

function separarTermino_contieneTodosLosTerminos(termino) {
  const d = { $match: { $and: [] } }
  const estructura = termino => {
    return {
      "puntos._contenido": {
        $regex: termino,
        $options: "i",
      },
    }
  }

  termino.split(",").forEach(x => d.$match.$and.push(estructura(x)))
  return d
}
function separarTermino_contieneTodosLosTerminosExactos(termino) {
  const d = { $match: { $and: [] } }
  const estructura = termino => {
    return {
      "puntos._contenido": {
        $regex: "(?:\\W|^)(\\Q" + termino + "\\E)(?:\\W|$)",
        $options: "i",
      },
    }
  }

  termino.split(",").forEach(x => d.$match.$and.push(estructura(x)))
  return d
}

module.exports = app
