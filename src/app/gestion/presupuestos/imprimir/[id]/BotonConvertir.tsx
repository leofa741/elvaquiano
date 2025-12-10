"use client";

export default function BotonConvertir({
  id,
  estado,
}: {
  id: string;
  estado: string;
}) {
  if (estado === "convertido") {
    return <p className="text-gray-400">Este presupuesto ya fue convertido en pedido.</p>;
  }

  const convertir = async () => {
    try {
      const res = await fetch(`/api/gestion/presupuestos/${id}/convertir`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.pedidoId) {
        window.location.href = `/gestion/pedidos/${data.pedidoId}`;
      }
    } catch (err) {
      alert("Error al convertir el presupuesto");
    }
  };

  return (
    <button
      onClick={convertir}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition"
    >
      Convertir en Pedido
    </button>
  );
}
