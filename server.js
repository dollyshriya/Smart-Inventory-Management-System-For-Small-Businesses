const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const sendSMS = require('./sendSms');
const multer = require('multer');
const { parse } = require('csv-parse');
const { finished } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

// --- MySQL DB Config ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Shriya@123',
    database: 'sims_db'
});

// Establish the database connection ONCE
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('✅ Connected to MySQL database');

    // --- HELPER FUNCTION TO CHECK AND INSERT NOTIFICATION ---
    function checkAndInsertNotification(message) {
        console.log('➡️ checkAndInsertNotification called with message:', message);
        const checkDuplicateSql = 'SELECT * FROM notifications WHERE message = ?';
        db.query(checkDuplicateSql, [message], (duplicateErr, duplicateResults) => {
            if (duplicateErr) {
                console.error('Error checking for duplicate notifications:', duplicateErr);
                return;
            }
            if (duplicateResults.length === 0) {
                const notifySql = 'INSERT INTO notifications (message) VALUES (?)';
                db.query(notifySql, [message], (notifyErr) => {
                    if (notifyErr) {
                        console.error('Failed to store notification:', notifyErr);
                    } else {
                        console.log(`Notification created: ${message}`);

                        // --- SEND SMS HERE ---
                        const adminPhoneNumber = '+916309886856'; 

                        sendSMS(adminPhoneNumber, message)
                            .then(sms => console.log(`SMS sent to ${adminPhoneNumber}: ${sms.sid}`))
                            .catch(err => console.error('Error sending SMS:', err));
                        // --- END SEND SMS ---
                    }
                });
            } else {
                console.log(`Notification already exists: ${message}`);
            }
        });
    }

    // --- START OF LOW STOCK CHECK ON SERVER STARTUP ---
    const checkLowStockSql = 'SELECT * FROM inventory WHERE quantity <= 10';
    db.query(checkLowStockSql, (err, lowStockProducts) => {
        if (err) {
            console.error('Error checking initial low stock:', err);
            return;
        }

        lowStockProducts.forEach(product => {
            const alertMessage = `⚠️ Low Stock Alert: "${product.name}" has only ${product.quantity} left. Please restock.`;
            checkAndInsertNotification(alertMessage);
        });
    });
    // --- END OF LOW STOCK CHECK ON SERVER STARTUP ---


    // Set up multer for handling file uploads
    const storage = multer.memoryStorage(); // Store the file in memory for processing
    const upload = multer({ storage: storage });
    
    // Database connection setup (using a simple array for this example)
    let products = [];
    
    // API endpoint to handle CSV file upload
    app.post('/api/products/bulk', upload.single('file'), async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }
    
      const fileContent = req.file.buffer.toString('utf-8');
    
      try {
        const records = [];
        const parser = parse({
          delimiter: ',',
          columns: header => header.map(column => column.trim().toLowerCase()), // Trim and lowercase headers
          skip_empty_lines: true
        });
    
        parser.on('readable', function () {
          let record;
          while ((record = this.read()) !== null) {
            records.push(record);
          }
        });
        parser.on('error', function (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error parsing CSV file.' });
        });
        finished(parser, (err) => {
          if (err) {
            console.error('Stream finished with error.', err);
             return res.status(500).json({ error: 'Error processing CSV stream.' });
          }
          //console.log('Parsing completed', records); // Debug
            processRecords(records)
        });
        parser.write(fileContent);
        parser.end();
    
        function processRecords(records){
            // Validate the data and transform it into the desired format
            const newProducts = [];
            const validationErrors = [];
            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              if (i === 0) continue; // Skip header row
    
              if (
                record.product &&
                !isNaN(record.quantity) &&
                !isNaN(record.price)
              ) {
                const expiryDate = record['expiry date'] ? new Date(record['expiry date']) : null;
                 if (expiryDate && isNaN(expiryDate.getTime())) {
                    validationErrors.push(`Invalid date format in row ${i + 1}: Expiry Date must be a valid date.`);
                    continue; // Skip this row
                 }
                newProducts.push({
                  name: record.product,
                  quantity: parseInt(record.quantity, 10),
                  price: parseFloat(record.price),
                  expiry_date: expiryDate, // Store as Date object
                });
              } else {
                validationErrors.push(`Invalid data in row ${i + 1}.  Make sure 'product', 'quantity', and 'price' are provided and that 'quantity' and 'price' are numbers.`);
              }
            }
    
            if (validationErrors.length > 0) {
              return res.status(400).json({ errors: validationErrors });
            }
            // Add new products to the database (in-memory array in this example)
            products.push(...newProducts);
    
            // Respond with the updated product list
            return res.status(200).json(products);
        }
    
    
      } catch (error) {
        console.error('Error handling file upload:', error);
        return res.status(500).json({ error: 'Internal server error.' });
      }
    });
    
   
    // --- API ENDPOINTS ---

    // Register
    app.post('/register', (req, res) => {
        const { username, password, phone, shopName } = req.body;
        const sql = 'INSERT INTO user_accounts (username, password, phone, shop_name) VALUES (?, ?, ?, ?)';

        db.query(sql, [username, password, phone, shopName], (err, result) => {
            if (err) {
                console.error('❌ Register error:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Username already exists' });
                }
                return res.status(500).json({ message: 'Database error', error: err });
            }
            const user = { id: result.insertId, username, phone, shop_name: shopName };
            res.status(200).json({ message: 'Registration successful', user });
        });
    });

    // Login
    app.post('/login', (req, res) => {
        const { username, password } = req.body;
        const sql = 'SELECT * FROM user_accounts WHERE username = ? AND password = ?';

        db.query(sql, [username, password], (err, results) => {
            if (err) {
                console.error('❌ Login error:', err);
                return res.status(500).json({ message: 'Database error', error: err });
            }

            if (results.length > 0) {
                const user = results[0];
                res.status(200).json({ message: 'Login successful', user });
            } else {
                res.status(401).json({ message: 'Invalid username or password' });
            }
        });
    });

    // Get profile by username
    app.get('/profile/:username', (req, res) => {
        const username = req.params.username;
        const sql = 'SELECT username, phone, shop_name FROM user_accounts WHERE username = ?';

        db.query(sql, [username], (err, results) => {
            if (err) {
                console.error('❌ Error fetching profile:', err);
                return res.status(500).json({ message: 'Database error', error: err });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json(results[0]);
        });
    });

    // Update profile
    app.put('/profile/:username', (req, res) => {
        const { username } = req.params;
        const { phone, shopName } = req.body;

        const checkSql = 'SELECT * FROM user_accounts WHERE username = ?';
        db.query(checkSql, [username], (err, results) => {
            if (err) {
                console.error('❌ Profile check error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const updateSql = 'UPDATE user_accounts SET phone = ?, shop_name = ? WHERE username = ?';
            db.query(updateSql, [phone, shopName, username], (err) => {
                if (err) {
                    console.error('❌ Profile update error:', err);
                    return res.status(500).json({ message: 'Update failed' });
                }

                res.json({ message: 'Profile updated successfully' });
            });
        });
    });

    // Add Product
app.post('/api/products', (req, res) => {
    const { name, quantity, price, expiryDate } = req.body;
    
     // Input validation: Check for missing or invalid fields
    if (!name || quantity == null || price == null || !expiryDate) {
    return res.status(400).json({ message: 'Missing required fields' });
    }
    
     const sql = 'INSERT INTO inventory (name, quantity, price, expiry_date) VALUES (?, ?, ?, ?)';
    
     db.query(sql, [name, quantity, price, expiryDate], (err, result) => {
     if (err) {
     console.error('❌ Error adding product:', err);
     return res.status(500).json({ message: 'Error adding product', error: err });
     }
    
    // Low stock check
    if (quantity <= 10) {
     const alertMessage = `⚠️ Low Stock Alert: "${name}" has only ${quantity} left. Please restock.`;
     checkAndInsertNotification(alertMessage);
     }
    
     res.status(200).json({ message: 'Product added successfully', productId: result.insertId });
     });
    });
   
  // Update Product
   app.put('/api/products/:productId', (req, res) => {
       const productId = req.params.productId;
            const { name, quantity, price, expiryDate } = req.body;
        
            // Input validation: Check for missing or invalid fields
            if (!name || quantity == null || price == null || !expiryDate) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
        
            const sql = 'UPDATE inventory SET name = ?, quantity = ?, price = ?, expiry_date = ? WHERE product_id = ?';
        
            db.query(sql, [name, quantity, price, expiryDate, productId], (err, result) => {
                if (err) {
                    console.error('❌ Error updating product:', err);
                    return res.status(500).json({ message: 'Error updating product', error: err });
                }
        
                // Check if the product exists
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Product not found' });
                }
        
                // Low stock logic
                if (quantity <= 10) {
                    const alertMessage = `⚠️ Low Stock Alert: "${name}" has only ${quantity} left. Please restock.`;
                    checkAndInsertNotification(alertMessage);
                } else {
                    // Clear old alerts if stock is okay
                    const deleteNotifySql = 'DELETE FROM notifications WHERE message LIKE ?';
                    db.query(deleteNotifySql, [`⚠️ Low Stock Alert: "${name}%`], (deleteErr) => {
                        if (deleteErr) {
                            console.error('Error deleting old notifications:', deleteErr);
                        } else {
                            console.log(`✅ Removed low stock alerts for "${name}"`);
                        }
                    });
                }
        
                res.status(200).json({ message: 'Product updated successfully' });
            });
        });
    
    // Delete Product
    app.delete('/api/products/:productId', (req, res) => {
        const productId = req.params.productId;
    
        // Get product name first
        const getNameSql = 'SELECT name FROM inventory WHERE product_id = ?';
        db.query(getNameSql, [productId], (nameErr, nameResult) => {
            if (nameErr || nameResult.length === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }
    
            const name = nameResult[0].name;
    
            // Delete product
            const sql = 'DELETE FROM inventory WHERE product_id = ?';
            db.query(sql, [productId], (err) => {
                if (err) {
                    console.error('❌ Error deleting product:', err);
                    return res.status(500).json({ message: 'Error deleting product', error: err });
                }
    
     // Remove related low stock notification
    const deleteNotifySql = 'DELETE FROM notifications WHERE message LIKE ?';
     db.query(deleteNotifySql, [`⚠️ Low Stock Alert: \"${name}%`], (deleteErr) => {
     if (deleteErr) {
     console.error('Error deleting notifications for product:', deleteErr);
     } else {
     console.log(`✅ Removed notifications for deleted product "${name}"`);
     }
     });
    
                res.status(200).json({ message: 'Product deleted successfully' });
            });
        });
    });
    
    // Get All Products
    app.get('/api/products', (req, res) => {
    const sql = 'SELECT * FROM inventory';
    
    db.query(sql, (err, results) => {
     if (err) {
   console.error('❌ Error fetching inventory:', err);
    return res.status(500).json({ message: 'Error fetching inventory', error: err });
     }
     res.status(200).json(results);
    });
    });
    

    // PATCH: Quantity Adjustment with Notification
    app.patch('/api/products/:productId/quantity', (req, res) => {
        const productId = req.params.productId;
        const { quantityChange } = req.body;

        if (typeof quantityChange !== 'number') {
            return res.status(400).json({ message: 'quantityChange must be a number' });
        }

        const fetchSql = 'SELECT * FROM inventory WHERE product_id = ?';
        db.query(fetchSql, [productId], (fetchErr, fetchResult) => {
            if (fetchErr) return res.status(500).json({ message: 'Error fetching product', error: fetchErr });
            if (fetchResult.length === 0) return res.status(404).json({ message: 'Product not found' });

            const product = fetchResult[0];
            const newQuantity = product.quantity + quantityChange;

            if (newQuantity < 0) {
                return res.status(400).json({ message: 'Quantity cannot be negative' });
            }

            const updateSql = 'UPDATE inventory SET quantity = ? WHERE product_id = ?';
            db.query(updateSql, [newQuantity, productId], (updateErr) => {
                if (updateErr) return res.status(500).json({ message: 'Error updating quantity', error: updateErr });

                console.log(`Quantity for "${product.name}" updated to ${newQuantity}`);
                if (newQuantity <= 10) {
                    const alertMessage = `⚠️ Low Stock Alert: "${product.name}" has only ${newQuantity} left. Please restock.`;
                    checkAndInsertNotification(alertMessage);
                    return res.status(200).json({ message: 'Quantity updated & low stock notification checked', newQuantity });
                } else {
                    // If stock is replenished, check and remove existing low stock notifications for this product
                    const deleteNotifySql = 'DELETE FROM notifications WHERE message LIKE ?';
                    db.query(deleteNotifySql, [`⚠️ Low Stock Alert: "${product.name}%`], (deleteErr) => {
                        if (deleteErr) console.error('Error deleting old notifications:', deleteErr);
                        else console.log(`Removed low stock notifications for "${product.name}" as stock is now above 10.`);
                    });
                    return res.status(200).json({ message: 'Quantity updated', newQuantity });
                }
            });
        });
    });

    // GET: Fetch Unique Notifications
    app.get('/api/notifications', (req, res) => { // Changed endpoint name to be more descriptive
        const fetchNotificationsSql = 'SELECT message, MAX(created_at) AS created_at, MIN(id) AS id FROM notifications GROUP BY message ORDER BY created_at DESC';
        db.query(fetchNotificationsSql, (err, notifications) => {
            if (err) {
                console.error("DB Unique Notification Fetch Error:", err);
                return res.status(500).json({ message: 'Error fetching unique notifications' });
            }
            res.status(200).json(notifications);
        });
    });

    // --- Get Sales Report ---
//    Combine all sales report logic into one endpoint
app.get('/api/reports/sales', (req, res) => {
    const { type, startDate, endDate } = req.query;

    let sql = '';
    let params = [];

    switch (type) {
        case 'daily':
            sql = `
                    SELECT sale_date AS date, SUM(quantity_sold) AS sales
                    FROM sales
                    WHERE sale_date = CURDATE()
                    GROUP BY sale_date
                    ORDER BY sale_date
                    `;
            break;
        case 'weekly':
            sql = `
                    SELECT sale_date AS date, SUM(quantity_sold) AS sales
                    FROM sales
                    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)
                    GROUP BY sale_date
                    ORDER BY sale_date
                    `;
            break;
        case 'monthly':
            sql = `
                    SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') AS date, SUM(quantity_sold) AS sales
                    FROM sales
                    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
                    ORDER BY date
                    `;
            break;
        case 'custom':
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start and end dates are required for custom reports' });
            }
            sql = `
                    SELECT sale_date AS date, SUM(quantity_sold) AS sales
                    FROM sales
                    WHERE sale_date BETWEEN ? AND ?
                    GROUP BY sale_date
                    ORDER BY sale_date
                    `;
            params = [startDate, endDate];
            break;
        default:
            sql = `
                    SELECT sale_date AS date, SUM(quantity_sold) AS sales
                    FROM sales
                    GROUP BY sale_date
                    ORDER BY sale_date
                    `;
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Error fetching sales report:', err);
            return res.status(500).json({ message: 'Error fetching sales report', error: err });
        }
        // Ensure the result is an array of objects with date and sales properties
        const formattedResults = results.map(item => ({
            date: item.date,
            sales: Number(item.sales) // Ensure sales is a number
        }));
        res.status(200).json(formattedResults);
    });
});

// --- Get Inventory Report ---
app.get('/api/reports/inventory', (req, res) => {
    const sql = `
            SELECT name, quantity
            FROM inventory
            ORDER BY name
        `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching inventory report:', err);
            return res.status(500).json({ message: 'Error fetching inventory report', error: err });
        }
        res.status(200).json(results);
    });
});

// --- Get Expiration Report ---
app.get('/api/reports/expiration', (req, res) => {
    const { days = 30 } = req.query;
    const sql = `
            SELECT
                name,
                expiry_date,
                DATEDIFF(expiry_date, CURDATE()) AS days_until_expiration
            FROM inventory
            WHERE expiry_date > CURDATE() AND DATEDIFF(expiry_date, CURDATE()) <= ?
            ORDER BY days_until_expiration ASC
        `;
    db.query(sql, [days], (err, results) => {
        if (err) {
            console.error('❌ Error fetching expiration report:', err);
            return res.status(500).json({ message: 'Error fetching expiration report', error: err });
        }
        res.status(200).json(results);
    });
});

// --- Get Top Selling Products Report ---
app.get('/api/report/top-selling', (req, res) => {
    const period = 'weekly';
    let sql = '';

    if (period === 'weekly') {
        sql = `
            SELECT p.name AS product_name, SUM(s.quantity_sold) AS total_sold
            FROM sales s
            JOIN inventory p ON s.product_id = p.product_id
            WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)
            GROUP BY p.product_id, p.name
            ORDER BY total_sold DESC
            LIMIT 10
        `;
    } else {
        sql = `
            SELECT p.name AS product_name, SUM(s.quantity_sold) AS total_sold
            FROM sales s
            JOIN inventory p ON s.product_id = p.product_id
            WHERE s.sale_date = CURDATE()
            GROUP BY p.product_id, p.name
            ORDER BY total_sold DESC
            LIMIT 10
        `;
    }

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching top selling products:', err);
            return res.status(500).json({ message: 'Error fetching top selling products', error: err });
        }
        res.status(200).json(results);
    });
});

// --- Make Sale Endpoint ---
app.post('/api/sales', (req, res) => {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Invalid request. Products must be a non-empty array.' });
    }

    let totalSale = 0;

    const salesDetails = [];
    const updateQueries = [];
    const fetchQueries = [];

    for (const product of products) {
        const { productId, quantity } = product;

        if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid product or quantity. productId and quantity must be positive integers.' });
        }
        fetchQueries.push(
            new Promise((resolve, reject) => {
                const fetchSql = 'SELECT price, name, quantity FROM inventory WHERE product_id = ?';
                db.query(fetchSql, [productId], (err, results) => {
                    if (err) {
                        reject({ error: err, productId: productId });
                    } else if (results.length === 0) {
                        reject({ error: { message: 'Product not found' }, productId: productId });
                    } else {
                        resolve({ price: results[0].price, name: results[0].name, quantity: results[0].quantity, productId: productId, quantityToSell: quantity });
                    }
                });
            })
        );
    }
    Promise.all(fetchQueries)
        .then(fetchedProducts => {
            for (const fetchedProduct of fetchedProducts) {
                if (fetchedProduct.quantity < fetchedProduct.quantityToSell) {
                    return res.status(400).json({ message: `Insufficient stock for product "${fetchedProduct.name}". Available quantity: ${fetchedProduct.quantity}` });
                }
            }
            for (const fetchedProduct of fetchedProducts) {
                const salePrice = fetchedProduct.price;
                const quantitySold = fetchedProduct.quantityToSell;
                const productId = fetchedProduct.productId;
                const productName = fetchedProduct.name;
                totalSale += salePrice * quantitySold;
                salesDetails.push({
                    productId: productId,
                    quantitySold: quantitySold,
                    salePrice: salePrice,
                    productName: productName,
                    saleDate: new Date()
                });

                updateQueries.push(
                    new Promise((resolve, reject) => {
                        const updateSql = 'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?';
                        db.query(updateSql, [quantitySold, productId], (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    })
                );
            }
            Promise.all(updateQueries)
                .then(() => {
                    const insertSalesQueries = [];
                    for (const sale of salesDetails) {
                        const insertSql = 'INSERT INTO sales (product_id, quantity_sold, sale_date, product_name) VALUES (?, ?, ?, ?)';
                        insertSalesQueries.push(
                            new Promise((resolve, reject) => {
                                db.query(insertSql, [sale.productId, sale.quantitySold, sale.saleDate, sale.productName], (err) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                });
                            })
                        );
                    }
                    Promise.all(insertSalesQueries)
                        .then(() => {
                            res.status(200).json({ message: 'Sale completed successfully', totalSale: totalSale });
                        })
                        .catch(err => {
                            console.error('❌ Error inserting sale details:', err);
                            res.status(500).json({ message: 'Error inserting sale details', error: err });
                        });
                })
                .catch(err => {
                    console.error('❌ Error updating inventory:', err);
                    res.status(500).json({ message: 'Error updating inventory', error: err });
                });
        })
        .catch(errorResult => {
            if (errorResult.error && errorResult.productId) {
                if (errorResult.error.message === 'Product not found') {
                    res.status(404).json({ message: `Product with ID ${errorResult.productId} not found` });
                } else {
                    console.error(`❌ Error fetching product details for product ID ${errorResult.productId}:`, errorResult.error);
                    res.status(500).json({ message: 'Database error fetching product details', error: errorResult.error });
                }
            } else if (errorResult.error) {
                console.error(`❌ Error fetching product details :`, errorResult.error);
                res.status(500).json({ message: 'Database error fetching product details', error: errorResult.error });
            }
            else {
                console.error('❌ Error fetching product details:', errorResult);
                res.status(500).json({ message: 'Error fetching product details', error: errorResult });
            }
        });
});

    // --- START THE SERVER ---
    const PORT = 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});
