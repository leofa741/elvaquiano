"use client";
import Swal from "sweetalert2";

export default function BotonConvertir({
  id,
  estado,
  origen
}: {
  id: string;
  estado: string;
  origen: string;
}) {
  if (estado === "convertido") {
    return <p className="text-gray-400">Este presupuesto ya fue convertido en pedido.</p>;
  }

  const convertir = async () => {
    if (origen !== 'online' && origen !== 'mostrador') {
      Swal.fire(
        'Falta información',
        'Debes indicar si el pedido es Online o Mostrador antes de convertir.',
        'warning'
      );
      return;
    }



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
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      Convertir a Pedido
    </button>
  );
}
