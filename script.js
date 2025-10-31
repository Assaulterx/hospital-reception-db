const API_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
const sections=document.querySelectorAll(".section");const menuItems=document.querySelectorAll(".menu li");
menuItems.forEach(item=>{item.addEventListener("click",()=>{menuItems.forEach(i=>i.classList.remove("active"));
item.classList.add("active");const target=item.dataset.section;document.getElementById("pageTitle").textContent=item.textContent;
sections.forEach(sec=>sec.classList.remove("active"));if(target)document.getElementById(target).classList.add("active");});});
async function fetchData(sheetName,tableId){const res=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"get",sheet:sheetName})});
const data=await res.json();if(data.status==="success"){const table=document.querySelector(`#${tableId} tbody`);table.innerHTML="";
data.data.slice(1).forEach(row=>{const tr=document.createElement("tr");row.forEach(cell=>{const td=document.createElement("td");
td.textContent=cell;tr.appendChild(td);});table.appendChild(tr);});if(sheetName==="Patients")document.getElementById("totalPatients").textContent=data.data.length-1;
if(sheetName==="Doctors")document.getElementById("totalDoctors").textContent=data.data.length-1;
if(sheetName==="Appointments")document.getElementById("totalAppointments").textContent=data.data.length-1;}}
async function addData(sheet,rowData){const res=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"add",sheet,data:rowData})});
const result=await res.json();return result.status==="success";}
document.getElementById("patientForm").addEventListener("submit",async e=>{e.preventDefault();const data=[Date.now(),pName.value,pGender.value,pAge.value,pPhone.value,pDept.value];
if(await addData("Patients",data)){alert("Patient added!");fetchData("Patients","patientsTable");e.target.reset();}});
document.getElementById("doctorForm").addEventListener("submit",async e=>{e.preventDefault();const data=[Date.now(),dName.value,dSpec.value,dPhone.value];
if(await addData("Doctors",data)){alert("Doctor added!");fetchData("Doctors","doctorsTable");e.target.reset();}});
document.getElementById("appointmentForm").addEventListener("submit",async e=>{e.preventDefault();
const data=[Date.now(),aPatientId.value,aDoctorId.value,aDate.value,aTime.value,aStatus.value];
if(await addData("Appointments",data)){alert("Appointment scheduled!");fetchData("Appointments","appointmentsTable");e.target.reset();}});
window.onload=()=>{fetchData("Patients","patientsTable");fetchData("Doctors","doctorsTable");fetchData("Appointments","appointmentsTable");};
