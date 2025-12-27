import * as XLSX from 'xlsx';

// Create a new workbook
const wb = XLSX.utils.book_new();

// Define data with required columns: Roll Number, Name, Branch, Mobile Number
const data = [
    ["Roll Number", "Name", "Branch", "Mobile Number"],
    ["20MCA01", "Alice Johnson", "MCA", "9876543210"],
    ["20MCA02", "Bob Smith", "MCA", "9876543211"],
    ["20MBA01", "Charlie Brown", "MBA", "9876543212"],
    ["20CSE01", "Diana Prince", "CSE", "9876543213"],
    ["20CSE02", "Evan Wright", "CSE", "9876543214"],
    ["20MCA03", "Fiona Green", "MCA", "9876543215"],
    ["20MBA02", "George King", "MBA", "9876543216"],
    ["20CSE03", "Hannah White", "CSE", "9876543217"],
    ["20MCA04", "Ian Black", "MCA", "9876543218"],
    ["20MBA03", "Jack Blue", "MBA", "9876543219"]
];

// Create a worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Append the worksheet to the workbook
XLSX.utils.book_append_sheet(wb, ws, "Attendance");

// Write to file
XLSX.writeFile(wb, "test_attendance_v2.xlsx");

console.log("Created test_attendance_v2.xlsx successfully.");
