const app = require("express")()
const Documento = require("../models/documento.model")
const ObjectId = require("mongoose").Types.ObjectId
const utilidades = require("../utilidades/utilidades")

app.get("/", async (req, res, next) => {
  try {
    // Limpiamos los diacriticos del termino de busqueda
    req.query.termino = utilidades
      .limpiarDiacriticos(decodeURIComponent(req.query.termino))
      .trim()

    if (req.query?.documentos) {
      req.query.documentos = req.query.documentos
        .split(",")
        .map(x => ObjectId(x))
    }

    // Paginacion
    const limit = (req.query.limit ?? 50) * 1
    const skip = (req.query.skip ?? 0) * 1

    //Buscamos las coincidencias en documentos sin puntos
    const documentos = await busquedaDocumentos(req, {
      limit,
      skip,
      documentos: req.query.documentos,
    })
    const documentos_total = await busquedaDocumentos(req, {
      contar: true,
      documentos: req.query.documentos,
    })

    //Almacenamos el resultado
    const resultado = { documentos, documentos_total }

    if (req.query.termino) {
      //Buscamos por terminos
      for (const key of Object.keys(parametrosRegex)) {
        if (!req.query.opciones?.includes(key)) continue

        resultado[key] = await Documento.aggregate(
          query({
            ...parametrosRegex[key],
            termino: req.query.termino,
            limit,
            skip,
            documentos: req.query.documentos,
          })
        ).exec()

        resultado[key + "_total"] = await Documento.aggregate(
          query({
            ...parametrosRegex[key],
            termino: req.query.termino,
            contar: true,
            documentos: req.query.documentos,
          })
        ).exec()

        //Quitamos el arreglo a los totales
        resultado[key + "_total"] = resultado[key + "_total"]?.pop().total ?? 0
      }
    }

    // Buscamos por puntos
    if (req.query.puntos) {
      const puntosSeleccionados = await Documento.aggregate([
        {
          $project: {
            _id: 1,
            puntos: 1,
          },
        },
        {
          $project: {
            _id: 1,
            "puntos._contenido": 0,
          },
        },

        {
          $unwind: "$puntos",
        },

        {
          $match: {
            "puntos.consecutivo": {
              $in: obtenerNumeroDePuntos(req.query.puntos),
            },
          },
        },

        {
          $group: {
            _id: "$_id",
            puntos: { $push: "$puntos" },
          },
        },
      ]).exec()

      resultado["puntosSeleccionados"] = puntosSeleccionados
    }

    //Busqueda parcial
    res.send(resultado)
  } catch (error) {
    next(error)
  }
})

function obtenerNumeroDePuntos(puntos) {
  // Debe tener la siguiente estructura:
  // 1,2-10,

  if (!puntos) throw "Debes definir rangos de puntos"

  const grupos = puntos
    //Separamos los grupos
    .split(",")
    //Si hay espacios los eliminamos
    .map(x => x.trim())
    //Obtenemos un solo arreglo expandiendo todos los grupos
    // 1 => 1
    // 4-9 => 4,5,6,7,8,9
    // [1,4,5,6,7,8,9]
    .reduce((pre, cur) => {
      //Si es un rango debe contener-
      if (cur.includes("-")) {
        const valores = cur.split("-")
        let inicio = valores[0] * 1
        const fin = valores[1] * 1

        for (let i = inicio; i <= fin; i++) {
          pre.push(i)
        }
      } else pre.push(cur)
      return pre
    }, [])

  return Array.from(
    new Set(
      grupos
        //Lo devolvemos ordenados y en tipo string
        .map(x => x * 1)
        .sort((a, b) => a - b)
        .map(x => x + "")
    )
  )
}

async function busquedaDocumentos(req, opciones = { contar: false }) {
  if (opciones.contar) {
    return await Documento.find(
      obtenerBusqueda(req.query.termino, opciones)
    ).countDocuments()
  }
  return await Documento.find(obtenerBusqueda(req.query.termino, opciones))
    .select("nombre indice descripcion url")
    .exec()
}

const parametrosRegex = {
  todosLosTerminosExactos: {
    tipo: "and",
    completo: true,
  },
  todosLosTerminosParcial: {
    tipo: "and",
    completo: false,
  },
  palabraCompleta: {
    tipo: "or",
    completo: true,
  },
  palabraParcial: {
    tipo: "or",
    completo: false,
  },
}

const query = opciones => {
  const lista = []

  if (opciones.documentos) {
    lista.push({ $match: { _id: { $in: opciones.documentos } } })
    console.log(lista[0].$match._id.$in)
  }

  lista.push(
    ...[
      {
        $project: {
          _id: 1,
          nombre: 1,
          descripcion: 1,
          indice: 1,
          puntos: 1,
        },
      },
      regex(opciones),

      {
        $unwind: "$puntos",
      },

      regex(opciones),
      {
        $unset: "puntos._contenido",
      },
    ]
  )

  if (!opciones.contar) {
    lista.push(
      ...[
        {
          $limit: opciones.limit,
        },
        {
          $skip: opciones.skip,
        },
        {
          $group: {
            _id: {
              _id: "$_id",
              nombre: "$nombre",
              descripcion: "$descripcion",
              indice: "$indice",
            },
            puntos: { $push: "$puntos" },
          },
        },
        {
          $addFields: {
            _id: "$_id._id",
            nombre: "$_id.nombre",
            descripcion: "$_id.descripcion",
            indice: "$_id.indice",
          },
        },
      ]
    )
  } else lista.push({ $count: "total" })

  return lista
}

function obtenerBusqueda(termino, opciones) {
  const terminoLimpio = termino?.trim()
  if (!terminoLimpio) return {}
  const campos = ["nombre", "indice.nombre", "descripcion"]
  const busqueda = {
    $or: campos.map(x => {
      return { [x]: { $regex: terminoLimpio, $options: "gi" } }
    }),
  }

  if (opciones.documentos) {
    busqueda["$and"] = [{ _id: { $in: opciones.documentos } }]
  }

  return busqueda
}

function regex(op = { tipo: "or", termino: "", completo: false }) {
  //Construimos el match por tipo. AND || OR
  const d = { $match: { [`$${op.tipo}`]: [] } }

  //Si es completo buscamos coincidencia exacta con la palabra
  const completo = termino => "(?:\\W|^)(\\Q" + termino + "\\E)(?:\\W|$)"
  //Si es incompleto buscamos coincidencia parcial con la palabra
  const incompleto = termino => termino

  //Construimos la estructura dentro del AND | OR
  const estructura = termino => {
    return {
      //Buscamos dentro del contenido sin diacriticos
      "puntos._contenido": {
        //Distiguimos si quiere completo o no
        $regex: op.completo ? completo(termino) : incompleto(termino),
        $options: "i",
      },
    }
  }

  //Creamos una query por cada termino según el tipo.
  op.termino
    .split(",")
    .forEach(x => d.$match[`$${op.tipo}`].push(estructura(x.trim())))
  return d
}

module.exports = app
