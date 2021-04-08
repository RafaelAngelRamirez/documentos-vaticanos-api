/**
 *
 * Elimina los diacriticos <br />
 * https://es.stackoverflow.com/questions/62031/eliminar-signos-diacr%C3%ADticos-en-javascript-eliminar-tildes-acentos-ortogr%C3%A1ficos
 *
 * @param {*} texto
 */
module.exports.limpiarDiacriticos = function eliminarDiacriticos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
