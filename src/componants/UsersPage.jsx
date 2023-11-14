import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Tag, Select } from "antd";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
const { Option } = Select;

const UsersPage = () => {

  const baseUrl = import.meta.env.VITE_REACT_API_URL;
  const [clients, setClients] = useState([]); 


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersResponse = await axios.get(`${baseUrl}/getAll`);
        // Filtrez d'abord les utilisateurs pour ne conserver que les rôles "client" et "SUNcollaborateur"
        const filteredUsers = usersResponse.data.filter(
          user => user.role === "client" || user.role === "SUNcollaborateur"
        );
  
        // Pour chaque utilisateur filtré, récupérez la dernière commande
        const clientsWithLastOrderPromises = filteredUsers.map(async (client) => {
          const ordersResponse = await axios.get(`${baseUrl}/ordersOfUser/${client.userId}`);
          const lastOrder = ordersResponse.data.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          return { ...client, lastOrder: lastOrder ? lastOrder.date : 'X' }; // 'X' pour aucune commande
        });
  
        const clientsWithLastOrder = await Promise.all(clientsWithLastOrderPromises);
        setClients(clientsWithLastOrder);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
  
    fetchUsers();
  }, [baseUrl]);

  //modifier le rôle de l'utilisateur
  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${baseUrl}/updateRole/${userId}`, { role: newRole });
      // Mettre à jour l'état local pour refléter le changement
      setClients(clients.map(client => 
        client.userId === userId ? { ...client, role: newRole } : client
      ));
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };
  

  const formatDate = (dateString) => {
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') {
      return 'X';
    }
      const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  //tableau
const columns = [
  {
    title: "Nom",
    dataIndex: "lastname",
    key: "lastname"
  },
  {
    title: "Prénom",
    dataIndex: "firstname",
    key: "firstname"
  },
  {
    title: "Email",
    dataIndex: "email",
    key: "email"
  },
  {
    title: "Téléphone",
    dataIndex: "telephone",
    key: "telephone",
    render: text => text || "X" 
  },
  {
    title: "Statut",
    dataIndex: "role",
    key: "role",
    render: (role, record) => (
      <Select defaultValue={role} style={{ width: 120 }} onChange={(newRole) => handleRoleChange(record.userId, newRole)}>
        <Option value="client">Client</Option>
        <Option value="SUNcollaborateur">SUNCollab</Option>
        {/* <Option value="invite">Invité</Option> */}
      </Select>
    )
  },
  
  {
    title: "Dernière commande",
    dataIndex: "lastOrder",
    key: "lastOrder",
    render: (lastOrder) => formatDate(lastOrder) , 
  },
 
]
  return (
    <div className="content_client">

      <Table dataSource={clients} columns={columns} rowKey="userId" pagination={{ pageSize: 6 }} />

    </div>
    
  )
}

export default UsersPage