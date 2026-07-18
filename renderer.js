const input = document.getElementById("nombre");
const boton = document.getElementById("boton");

boton.addEventListener("click", () => {
  const nombre = input.value.trim();
  window.api.saludar(nombre);
});