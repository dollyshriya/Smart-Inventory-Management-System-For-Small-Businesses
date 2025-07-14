import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, Title, Tooltip, Legend, ArcElement, BarElement);

const Report = () => {
    const [inventoryDataState, setInventoryData] = useState([]);
    const [topSellingProducts, setTopSellingProducts] = useState([]);
    const [loadingInventory, setLoadingInventory] = useState(true);
    const [loadingTopProducts, setLoadingTopProducts] = useState(true);

    useEffect(() => {
        const fetchInventoryData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/reports/inventory');
                setInventoryData(response.data);
            } catch (error) {
                console.error('Error fetching inventory data:', error);
            } finally {
                setLoadingInventory(false);
            }
        };

        const fetchTopSelling = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/report/top-selling?period=weekly');
                setTopSellingProducts(response.data);
            } catch (error) {
                console.error('Error fetching top selling products:', error);
            } finally {
                setLoadingTopProducts(false);
            }
        };

        fetchInventoryData();
        fetchTopSelling();
    }, []);

    const inventoryChartData = {
        labels: inventoryDataState.map(item => item.name),
        datasets: [{
            label: 'Inventory Levels',
            data: inventoryDataState.map(item => item.quantity),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
        }]
    };

    const topSellingChartData = {
        labels: topSellingProducts.map(item => item.product_name),
        datasets: [{
            label: 'Total Sold',
            data: topSellingProducts.map(item => item.total_sold),
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(255, 0, 0, 0.6)',
                'rgba(0, 255, 0, 0.6)',
                'rgba(0, 0, 255, 0.6)',
                'rgba(192, 192, 192, 0.6)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 0, 0, 1)',
                'rgba(0, 255, 0, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(192, 192, 192, 1)'
            ],
            borderWidth: 1
        }]
    };

    const Card = ({ className, children }) => <div className={`border rounded-md shadow-md ${className}`}>{children}</div>;
    const CardHeader = ({ children }) => <div className="p-4">{children}</div>;
    const CardTitle = ({ className, children }) => <h3 className={`text-lg font-medium ${className}`}>{children}</h3>;
    const CardContent = ({ children }) => <div className="p-4">{children}</div>;
    const Skeleton = ({ className, ...props }) => <div className={`bg-gray-200 animate-pulse rounded ${className}`} {...props} />;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-8 text-gray-800">Reports</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inventory Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-gray-700">Inventory Levels</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingInventory ? (
                            <Skeleton className="w-full h-64" />
                        ) : (
                            inventoryDataState.length > 0 ? (
                                <div style={{ height: '300px' }}>
                                    <Bar
                                        data={inventoryChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'top',
                                                    labels: { font: { size: 12 } }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    title: { display: true, text: 'Product', font: { size: 12 } },
                                                    ticks: { autoSkip: true, maxTicksLimit: 10, font: { size: 10 } }
                                                },
                                                y: {
                                                    title: { display: true, text: 'Quantity', font: { size: 12 } },
                                                    ticks: {
                                                        min: 0,
                                                        max: Math.max(...inventoryDataState.map(item => item.quantity)) * 1.1,
                                                        stepSize: Math.ceil(Math.max(...inventoryDataState.map(item => item.quantity)) * 0.2),
                                                        font: { size: 10 }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <p className="text-gray-500">No inventory data available.</p>
                            )
                        )}
                    </CardContent>
                </Card>

                {/* Top Selling Products Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-gray-700">
                            Top Selling Products (Weekly)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingTopProducts ? (
                            <Skeleton className="w-full h-64" />
                        ) : (
                            topSellingProducts.length > 0 ? (
                                <div style={{ height: '300px' }}>
                                    <Pie
                                        data={topSellingChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'top',
                                                    labels: { font: { size: 12 } }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <p className="text-gray-500">No top-selling data available for this week.</p>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Report; 