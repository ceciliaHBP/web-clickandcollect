import React, { useState, useEffect} from "react"
import { Draggable } from "react-beautiful-dnd"
import {AiFillCaretDown} from "react-icons/ai";
AiFillCaretDown

function Task({ task, index, updateCommandeStatus}) {

  const [showDetails, setShowDetails] = useState(false)
  const [isTaskReady, setIsTaskReady] = useState(task.order.status === "attente");
  const [orderDelivery, setOrderDelivery] = useState();

  useEffect(() => {
    setIsTaskReady(task.order.status === "pret");
  }, [task.order.status]);


  const toggleDetails = () => {
    setShowDetails(!showDetails)
    console.log(task)
  }

  const handleDelivery = () => {
    setOrderDelivery("livree");
    updateCommandeStatus(task.id, "livree");
    console.log("status", task.order.status);
  };
  const handleCancel = () => {
    setOrderDelivery("livree");
    updateCommandeStatus(task.id, "annulee");
    console.log("status", task.order.status);
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {provided => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          className="task_item"
        >
              <AiFillCaretDown className="details_order" onClick={toggleDetails}/>
              <div className="first_part_order">
                <p>Numéro de commande: {task.content.numero_commande}</p>
                <p>Client: {task.content.client}</p>
                <p>Nb de produits: {task.order.produits.length}</p>
                <p>Prix total: {calculateTotalPrice(task.order.produits)} euros</p>
              </div>
              {showDetails && (
                <div className="second_part_order">
                  <h4>Détails de la commande</h4>
                   {/* <p>Nb de produits: {task.order.produits.length}</p> */}
                  <ul>
                {task.order.produits.map((produit) => (
                  <li key={produit.id} className="list_order">
                    {produit.quantite}x{produit.nom} 
                  </li>
                ))}
                 <p>Date: {task.content.date}</p>
                 <p>Heure: {task.content.heure}</p>
                 <p>Magasin: {task.content.magasin}</p>
              </ul>
              <div className="buttons">
                <button className="button_delivery" disabled={!isTaskReady} onClick={handleDelivery}>Livrée</button>
                <button className="button_cancel" disabled={!isTaskReady} onClick={handleCancel}>Annulée</button>
              </div>
                
                </div>
          )}
              
        </div>
      )}
    </Draggable>
  )
}

function calculateTotalPrice(produits) {
  let total = 0;
  produits.forEach((produit) => {
    total += produit.quantite * produit.prix_unitaire;
  });
  return total;
}

export default Task