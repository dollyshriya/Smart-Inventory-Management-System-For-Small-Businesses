import React, { useState, useEffect } from 'react';
import './Inventory.css';
import axios from 'axios';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: '', price: '', expiryDate: '' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editedProduct, setEditedProduct] = useState({ name: '', quantity: '', price: '', expiryDate: '' });
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === 'name' ? value : value.replace(/^0+(?!$)/, '');

    if (editingProductId !== null) {
      setEditedProduct(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setNewProduct(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  const validateProduct = (product) =>
    product.name.trim() && !isNaN(product.quantity) && !isNaN(product.price) && product.expiryDate;

  const handleAddProduct = async () => {
    if (validateProduct(newProduct)) {
      const productToAdd = {
        name: newProduct.name,
        quantity: Number(newProduct.quantity),
        price: Number(newProduct.price),
        expiryDate: newProduct.expiryDate,
      };
      console.log('Adding product with expiryDate:', productToAdd.expiryDate);

      try {
        const response = await axios.post('http://localhost:5000/api/products', productToAdd);
        const insertedProductId = response.data.productId;

        setProducts(prev => [...prev, { ...productToAdd, productId: insertedProductId }]);
        setNewProduct({ name: '', quantity: '', price: '', expiryDate: '' });
        setIsAddingNew(false);
      } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product. Please try again.');
      }
    } else {
      alert('Please fill in all product fields correctly.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/products/${id}`);
      setProducts(products.filter(product => product.product_id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const startEditing = (product) => {
    setEditingProductId(product.product_id);
    setEditedProduct({
      name: product.name,
      quantity: product.quantity,
      price: product.price,
      expiryDate: product.expiry_date?.substring(0, 10),
    });
  };

  const handleEditSave = async (id) => {
    if (!validateProduct(editedProduct)) {
      alert('Invalid input. Please fill all fields.');
      return;
    }

    console.log('Saving edited product with expiryDate:', editedProduct.expiryDate);

    try {
      await axios.put(`http://localhost:5000/api/products/${id}`, editedProduct);
      setProducts(products.map(product =>
        product.product_id === id ? { ...product, ...editedProduct } : product
      ));
      setEditingProductId(null);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const filteredProducts = products.filter(product =>
    Object.values(product).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleFileChange = (event) => {
    setImportFile(event.target.files[0]);
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a CSV file to import.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      const csvText = e.target.result;
      const lines = csvText.split('\n').map(line => line.trim());
      if (lines.length < 2) {
        alert('Invalid CSV file format.');
        return;
      }
      const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
      const expectedHeaders = ['product', 'quantity', 'price', 'expiry date'];
      if (!expectedHeaders.every(header => headers.includes(header))) {
        alert('Invalid CSV file headers. Expected: Product, Quantity, Price, Expiry Date (case-insensitive).');
        return;
      }

      const newProducts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        if (values.length === headers.length) {
          const productData = {};
          for (let j = 0; j < headers.length; j++) {
            productData[headers[j]] = values[j];
          }

          if (productData.product && !isNaN(productData.quantity) && !isNaN(productData.price)) {
            newProducts.push({
              name: productData.product,
              quantity: parseInt(productData.quantity, 10),
              price: parseFloat(productData.price),
              expiryDate: productData['expiry date'] || null,
            });
          } else if (values.some(v => v.trim() !== '')) {
            console.warn('Skipping invalid row:', values);
          }
        }
      }

      if (newProducts.length > 0) {
        try {
          const response = await axios.post('http://localhost:5000/api/products/bulk', newProducts);
          setProducts(response.data);
          alert('Inventory data imported successfully!');
        } catch (error) {
          console.error('Error importing inventory data:', error);
          alert('Failed to import inventory data. Please check the file format and try again.');
        }
      } else {
        alert('No valid product data found in the CSV file.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read the CSV file.');
    };

    reader.readAsText(importFile);
  };

  const handleQuantityChange = async (id, newQuantity) => {
      if (newQuantity >= 0) {
     const productToUpdate = products.find(p => p.product_id === id);
    if (productToUpdate) {
     try {
       await axios.put(`http://localhost:5000/api/products/${id}`, {
        quantity: newQuantity,
     name: productToUpdate.name,
     price: productToUpdate.price,
     expiryDate: productToUpdate.expiry_date?.substring(0, 10) || productToUpdate.expiryDate // Handle potential undefined
     });
   setProducts(products.map(product =>
     product.product_id === id ? { ...product, quantity: newQuantity } : product
     ));
     } catch (err) {
     console.error('Failed to update quantity:', err);
     alert('Failed to update quantity.');
     }
   }
     }
    };
  return (
    <div className="inventory-container">    
      <div className="inventory-header">
        <input
          type="text"
          className="search-bar"
          placeholder="Search by name, quantity, price or date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="add-new-button" onClick={() => setIsAddingNew(true)}>+ Add New</button>
        <div className="import-section">
          <label htmlFor="importFile" className="import-label">Import CSV:</label>
          <input type="file" id="importFile" accept=".csv" onChange={handleFileChange} className="import-input" />
          <button onClick={handleImport} disabled={!importFile} className="import-button">Import</button>
        </div>
      </div>

      <div className="table-scroll-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price (₹)</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                let status = 'In Stock';
                let statusClass = '';
                if (product.quantity === 0) {
                  status = 'Out of Stock';
                  statusClass = 'out-of-stock';
                } else if (product.quantity < 10) {
                  status = 'Low Stock';
                  statusClass = 'low-stock';
                }

                const isEditing = editingProductId === product.product_id;
                const expiryDateFormatted = product.expiry_date ? formatDate(product.expiry_date) : '';

                return (
                  <tr key={product.product_id}>
                    <td>
                      {isEditing ? (
                        <input type="text" name="name" value={editedProduct.name} onChange={handleInputChange} />
                      ) : (
                        product.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="number" name="quantity" value={editedProduct.quantity} onChange={handleInputChange} />
                      ) : (
                        <div className="quantity-control">
                          <button className="quantity-button minus" onClick={() => handleQuantityChange(product.product_id, product.quantity - 1)}></button>
                          <span className="quantity-value">{product.quantity}</span>
                          <button className="quantity-button plus" onClick={() => handleQuantityChange(product.product_id, product.quantity + 1)}></button>
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="number" name="price" value={editedProduct.price} onChange={handleInputChange} />
                      ) : (
                        `₹${product.price}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="date" name="expiryDate" value={editedProduct.expiryDate} onChange={handleInputChange} />
                      ) : (
                        expiryDateFormatted
                      )}
                    </td>
                    <td className={statusClass}>{status}</td>
                    <td className="actions-column">
                      {isEditing ? (
                        <>
                          <button className="edit-btn" onClick={() => handleEditSave(product.product_id)}>Save</button>
                          <button className="cancel-btn" onClick={() => setEditingProductId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="edit-btn" onClick={() => startEditing(product)}>Edit</button>
                          <button className="delete-btn" onClick={() => handleDelete(product.product_id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddingNew && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Product</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }}>
              <input type="text" name="name" placeholder="Name" value={newProduct.name} onChange={handleInputChange} />
              <input type="number" name="quantity" placeholder="Quantity" value={newProduct.quantity} onChange={handleInputChange} />
              <input type="number" name="price" placeholder="Price" value={newProduct.price} onChange={handleInputChange} />
              <input type="date" name="expiryDate" value={newProduct.expiryDate} onChange={handleInputChange} />
              <div className="modal-actions">
                <button type="submit">Add</button>
                <button type="button" onClick={() => setIsAddingNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
   