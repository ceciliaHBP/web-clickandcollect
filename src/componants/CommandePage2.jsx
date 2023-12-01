import React, { useEffect, useState } from "react";
import axios from "axios";
import Tasks from "./Tasks2";
import { Input, Spin } from "antd";
import "../styles/styles.css";
const { Search } = Input;
import * as XLSX from "xlsx";
import Select from "react-select";

function CommandePageSimple({updateNewOrdersCount}) {
  const [commandes, setCommandes] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [hasOrders, setHasOrders] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  // const [searchTerm, setSearchTerm] = useState("");
  // const [timeoutId, setTimeoutId] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [uniqueDates, setUniqueDates] = useState([]);
  const [filteredCommandes, setFilteredCommandes] = useState([]);
  // const [currentOrders, setCurrentOrders] = useState([]);
  // const [ newOrdersCount, setNewOrdersCount] = useState(0);
  // const [newOrdersCount, setNewOrdersCountLocal] = useState(0);
    const [ newOrdersLength, setNewOrdersLength] = useState(0);


  // const [newOrderIds, setNewOrderIds] = useState(new Set());

  // const baseUrl = 'http://127.0.0.1:8080';
  const baseUrl = import.meta.env.VITE_REACT_API_URL;

  useEffect(() => {
    allOrders();
  }, []);

  // useEffect(() => {
  //   // Lorsque vous calculez newOrdersLength, mettez également à jour le compteur dans le composant Home
  //   setNewOrdersLength(newOrdersLength);
  // }, [newOrdersLength]);

  const updateOrderStatus = (orderId, status) => {
    // Update commandes
    setCommandes((prevCommandes) => {
      const updatedCommandes = { ...prevCommandes };
      //const orderToUpdate = updatedCommandes.tasks[orderId];
      const orderToUpdate = Object.values(updatedCommandes.tasks).find(
        (order) => order.key === orderId
      );
      if (orderToUpdate) {
        if (status === "livree" || status === "annulee") {
          //supprime des tasks une fois livree ou annulee
          delete updatedCommandes.tasks[orderToUpdate.numero_commande];
          //delete updatedCommandes.tasks[orderId];
        } else {
          orderToUpdate.status = status;
        }
      }
      return updatedCommandes;
    });

    // Update tableData
    setTableData((prevTableData) => {
      // Ajout d'une vérification pour s'assurer que prevTableData est un tableau
      if (!Array.isArray(prevTableData)) {
        console.error(
          "Expected prevTableData to be an array, but got:",
          prevTableData
        );
        return []; // Retourne un tableau vide ou la valeur par défaut souhaitée
      }
      const updatedTableData = [...prevTableData];
      const orderToUpdate = updatedTableData.find(
        (order) => order.key === orderId
      );
      if (orderToUpdate) {
        orderToUpdate.status = status;
      }
      return updatedTableData;
    });
  };

  useEffect(() => {
    if (commandes.tasks) {
      let tasksArray = Object.values(commandes.tasks);

      // Filtrer par date si une date est sélectionnée
      if (selectedDate) {
        tasksArray = tasksArray.filter((order) => order.date === selectedDate);
      }

      // Filtrer par terme de recherche
      // if (searchTerm) {
      //   const filterLibelle = tasksArray.map((order) => {
      //     return order.cartString.some((item) =>
      //       normalizeText(item.libelle).includes(normalizeText(searchTerm))
      //     );
      //   });

      //   tasksArray = tasksArray.filter((order, index) => filterLibelle[index]);
      // }

      // Mettre à jour les commandes filtrées
      setFilteredCommandes(tasksArray);
    }
  }, [selectedDate, commandes.tasks]);

  const allOrders = async () => {
    setIsLoading(true);

    try {
      const response = await axios.get(`${baseUrl}/allOrders`);

      if (!response.data.orders || response.data.orders.length === 0) {
        setHasOrders(false);
        return;
      } else {
        setHasOrders(true);
      }
      const orders = response.data.orders;

      //filtrer les commandes en attente
      let ordersEnAttente = orders.filter(
        (order) => order.status === "en attente"
      );

      let datesArray = [];
      ordersEnAttente.forEach((order) => {
        if (order.date) {
          datesArray.push(order.date);
        }
      });

      // je filtre les doublons
      const uniqueDatesArray = datesArray.filter((date, index, self) => {
        return self.indexOf(date) === index;
      });

      const selectOptions = uniqueDatesArray.map((date) => ({
        value: date,
        label: new Date(date).toLocaleDateString("fr-FR"),
      }));

      setUniqueDates(selectOptions);

      // je fltre les commandes sur les users existants
      const activeUsersResponse = await axios.get(`${baseUrl}/getAll`);
      const activeUserIds = new Set(
        activeUsersResponse.data.map((user) => user.userId)
      );

      // Filtrer les commandes pour les utilisateurs actifs
      const activeOrders = orders.filter((order) =>
        activeUserIds.has(order.userId)
      );

      // Fetch product details for each order
      const ordersWithDetails = await Promise.all(
        activeOrders.map(async (order) => {
          const productResponse = await axios.get(
            `${baseUrl}/getOrderProducts/${order.orderId}`
          );
          const storeResponse = await axios.get(
            `${baseUrl}/getOneStore/${order.storeId}`
          );
          const storeName = storeResponse.data.nom_magasin;

          let emailUser = "Utilisateur supprimé"; 
          try {
            const emailUserId = await axios.get(
              `${baseUrl}/getEmailByUserId/${order.userId}/email`
            );
            emailUser = emailUserId.data.email;
          } catch (emailError) {
            if (emailError.response && emailError.response.status === 404) {
              console.log(
                `Utilisateur supprimé pour la commande ${order.orderId}`
              );
              // Pas besoin de faire autre chose, emailUser a déjà une valeur par défaut
            } else {
              throw emailError; // Relancez l'erreur si ce n'est pas une erreur 404
            }
          }

          return {
            ...order,
            productDetails: productResponse.data,
            storeName: storeName,
            email: emailUser,
          };
        })
      );

      const orderData = transformOrderData(ordersWithDetails);

      const newOrdersCount = ordersWithDetails.filter(order => !order.view).length;
      updateNewOrdersCount(newOrdersCount); // Mise à jour du compteur dans Home

      // setNewOrdersLength(newOrdersCount);
      // setNewOrdersCountLocal(newOrdersCount); // Met à jour l'état local
      // setNewOrdersCount(newOrdersCount); 

      setCommandes(orderData);
      // Update status in commandes and tableData
      Object.values(orderData.tasks).forEach((order) => {
        updateOrderStatus(order.key, order.status);
      });
      setTableData(Object.values(orderData.tasks));

      // Itérer sur les commandes
      for (const order of orders) {
        const orderId = order.orderId;
        // Appel à l'API pour récupérer les détails de la commande
        const orderResponse = await axios.get(
          `${baseUrl}/getOrderProducts/${orderId}`
        );
        const orderData = orderResponse.data;

        for (const product of orderData) {
          // Accéder à la propriété 'libelle'
          const libelle = product.libelle;
          // Utilisez les données de la commande comme souhaité
          // console.log('Commande', orderId, ':', product);
          // console.log('Libelle:', libelle);
        }
      }

      //ajout ici
      return Object.values(orderData.tasks);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error("No orders found.");
        setHasOrders(false);
      } else {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const intervalId = setInterval(() => {
      allOrders();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // mise en forme data
  const transformOrderData = (orders) => {
    const orderArray = Object.values(orders);

    return {
      tasks: orderArray.reduce((acc, order) => {
        const productIdsArray = order.productIds.split(","); // Convertir la chaîne de caractères en tableau

        const date = new Date(order.date);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Les mois sont indexés à partir de 0
        const year = date.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        const cartArray = JSON.parse(order.cartString);
        // console.log('cartArray', cartArray)

        acc[order.numero_commande] = {
          key: order.orderId,
          numero_commande: order.numero_commande,
          client: order.firstname_client + " " + order.lastname_client,
          prix_total: order.prix_total,
          nombre_produits: productIdsArray.length,
          status: order.status,
          productDetails: order.productDetails,
          date: formattedDate,
          heure: order.heure,
          magasin: order.storeName,
          email: order.email,
          firstname: order.firstname_client,
          paid: order.paid,
          orderID: order.orderId,
          cartString: cartArray,
          view: order.view,
        };
        return acc;
      }, {}),

      columns: {
        "column-1": {
          id: "column-1",
          title: "Commandes en attente",
          taskIds: orderArray
            .filter((order) => order.status === "en attente")
            .map((order) => order.numero_commande),
        },
        "column-3": {
          id: "column-3",
          title: "Commandes prêtes à récupérer",
          taskIds: orderArray
            .filter((order) => order.status === "prete")
            .map((order) => order.numero_commande),
        },
      },
      columnOrder: ["column-1", "column-3"],
    };
  };

  //fonction draganddrop
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const start = commandes.columns[source.droppableId];
    const finish = commandes.columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...start,
        taskIds: newTaskIds,
      };

      const newState = {
        ...commandes,
        columns: {
          ...commandes.columns,
          [newColumn.id]: newColumn,
        },
      };

      setCommandes(newState);
      return;
    }

    // Moving from one list to another
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...start,
      taskIds: startTaskIds,
    };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finish,
      taskIds: finishTaskIds,
    };

    const newState = {
      ...commandes,
      columns: {
        ...commandes.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    };

    setCommandes(newState);

    // Log the status of the order
    let status;
    switch (newFinish.id) {
      case "column-1":
        status = "en attente";
        break;
      // case 'column-2':
      //   status = 'preparation';
      //   break;
      case "column-3":
        status = "prete";
        break;
      default:
        status = "unknown";
    }

    // Update the status of the order in the database
    try {
      const orderId = commandes.tasks[draggableId].key;
      const response = await axios.put(
        `${baseUrl}/updateStatusOrder/${orderId}`,
        { status }
      );
      updateOrderStatus(orderId, status);

      if (status === "prete") {
        const order = commandes.tasks[draggableId];
        const sendEmail = async () => {
          try {
            const res = await axios.post(`${baseUrl}/orderStatusReady`, {
              email: order.email,
              numero_commande: order.numero_commande,
              date: order.date,
              point_de_vente: order.magasin,
              firstname: order.firstname,
            });
          } catch (error) {
            console.error("An error occurred while sending the email:", error);
          }
        };
        sendEmail();
      }
    } catch (error) {
      console.error(
        "An error occurred while updating the order status:",
        error
      );
    }
  };

  const normalizeText = (text) => {
    return text
      .normalize("NFD") // Décompose les lettres en lettres de base et diacritiques
      .replace(/[\u0300-\u036f]/g, "") // Enlève les diacritiques
      .toLowerCase(); // Convertit en minuscules
  };

  // const handleSearch = (e) => {
  //   const newSearchTerm = normalizeText(e.target.value);
  //   setSearchTerm(newSearchTerm);
  //   console.log(newSearchTerm);
  // };

  // console.log("tasks", commandes.tasks);

  const handleExport = () => {
    function updateProductInfo(libelle, orderId, qty, isAntiGaspi, date) {
      if (!productInfo[libelle]) {
        productInfo[libelle] = {
          orderIds: new Set(),
          totalQty: 0,
          antiGaspiQty: 0,
          dates: [],
        };
      }
      productInfo[libelle].orderIds.add(orderId);
      productInfo[libelle].totalQty += qty;
      if (isAntiGaspi) {
        productInfo[libelle].antiGaspiQty += qty;
      }
      productInfo[libelle].dates.push(date);
    }

    let productInfo = {};

    let ordersToExport = [];
    if (selectedDate) {
      ordersToExport = Object.values(commandes.tasks).filter(
        (order) => order.date === selectedDate && order.status === "en attente"
      );
    } else {
      ordersToExport = Object.values(commandes.tasks).filter(
        (order) => order.status === "en attente"
      );
    }

    ordersToExport.forEach((order) => {
      order.cartString.forEach((item) => {
        let qty = item.qty;
        let libelle = item.libelle;
        if (item.type === "formule") {
          // Traiter chaque option de la formule
          ["option1", "option2", "option3"].forEach((optionKey) => {
            const option = item[optionKey];
            if (option && option.libelle) {
              updateProductInfo(
                option.libelle,
                order.orderID,
                item.qty,
                item.antigaspi,
                order.date
              );
            }
          });
        } else {
          // Traitement pour les produits non-formule
          updateProductInfo(
            item.libelle,
            order.orderID,
            qty,
            item.antigaspi,
            order.date
          );
        }
      });
    });

    // Transformer l'objet de suivi en tableau pour l'exportation
    const dataForExport = Object.entries(productInfo).map(
      ([libelle, info]) => ({
        "Nom produit": libelle,
        "Numéros de commande": Array.from(info.orderIds).join(", "),
        Quantité: info.totalQty,
        AntiGaspi: info.antiGaspiQty,
        Dates: info.dates.join(", "),
      })
    );

    console.log("dataForExport", dataForExport);

    const ws = XLSX.utils.json_to_sheet(dataForExport);

    // Créer un nouveau classeur et ajouter la feuille
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CommandesEnAttente");

    // Exporter le classeur
    XLSX.writeFile(wb, `Export des commandes ${selectedDate}.xlsx`);
  };

  const handleDateChange = (selectedOption) => {
    if (selectedOption) {
      setSelectedDate(selectedOption.label);
    } else {
      setSelectedDate("");
    }
  };
 

  // const decrementNewOrders = () => {
  //   setNewOrdersLength(prevLength => prevLength - 1);
  //   updateNewOrdersCount(prevLength);
  // };
  const decrementNewOrders = () => {
    console.log('je diminue de 1')
    updateNewOrdersCount(prevCount => prevCount - 1);
};


  return (
    <div className="commande-page">
      <div className="orderSelect">
        {/* <p> Il y a {newOrdersCount} nouvelles commandes</p> */}
        <Select
          options={uniqueDates}
          onChange={handleDateChange}
          value={selectedDate.label}
          placeholder="Filtrer par Date pour Exporter"
          isClearable
        />
        <button onClick={handleExport} className="button">
          Exporter
        </button>
        {/* <Search
              placeholder="Rechercher un produit"
              size="medium"
              style={{ width: 200 }}
              onChange={handleSearch}
            /> */}
      </div>

      {isLoading ? (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spin size="large" />
        </div>
      ) : hasOrders ? (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ width: "100%" }}>
              <Tasks
                commandes={commandes}
                onDragEnd={onDragEnd}
                updateOrderStatus={updateOrderStatus}
                updateNewOrdersCount={updateNewOrdersCount} 

              />
            </div>
          </div>
        </>
      ) : (
        <p>Pas de commandes</p>
      )}
    </div>
  );
}

export default CommandePageSimple;