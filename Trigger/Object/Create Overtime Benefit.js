var reg=0, reg1=0, rest=0, rest1=0, restreg=0, restreg1=0, restspe=0, restspe1=0, spe=0, spe1=0, nrm=0, nrm1=0;
var restDay = 0, holiday = 0, holType = 0, currentDay = 0, ALday = "";
var arrDay = ["sun","mon","tue","wed","thu","fri","sat"];
var arrRest = [];
var workDate = new Date("{!R177060.attendance_date}");

function getDuration(){
	var getTS = rbv_api.selectQuery("SELECT id, timesheet_date, time_in, time_out FROM timesheet_detail WHERE R74928006=? ORDER BY createdAt ASC", 100, parseInt("{!R177060#id}"));
	var dayOverlap = false, fStartTime = "", fEndTime = "", stat = "", shiftStart, shiftEnd, otIn, otOut, tsIn, tsOut, tsOut2, nightIn, nightOut, nightOut2, hoursWorked=0, hoursOT=0, nightHours = 0, duration = 0, normalHours=0, fdNormal=0, fdNight=0, fdDate, sdNormal=0, sdNight=0, sdDate, computeOT = 0, computeOTNight=0, totalOT=0, hoursLate=0, hoursDeficit=0;
	
	//get first in first out in timesheet
	for(var i=0; i<getTS.length; i++){
		if(i == 0) fStartTime = getTS[i][2];
		if(i == getTS.length-1) fEndTime = getTS[i][3];
	}
	
	var emp = parseInt("{!R177060.R70849964#id}");
	stat = parseInt(rbv_api.getIdByCode("shift_scheduler", "status", "^activeShift"));

	checkday(workDate);
	shiftArr = rbv_api.selectQuery("SELECT start_time_"+ALday+"_, end_time_"+ALday+"_, duration_"+ALday+", gp_"+ALday+", rd_"+ALday+", status, rd_sun, rd_mon, rd_tue, rd_wed, rd_thu, rd_fri, rd_sat, grace_period_deduction, break_time_cb_"+ALday+"_, break_time_cb2_"+ALday+"_, break_time_cb3_"+ALday+"_, break_time_"+ALday+"_, break_time2_"+ALday+"_, break_time3_"+ALday+"_ FROM shift_scheduler WHERE status= ? AND (ss_shift_start_date <= ? AND ss_shift_end_date >= ?) AND R7859871 =? ORDER BY createdAt DESC", 1, stat, workDate, workDate, emp);
	
	arrRest.push(shiftArr[0][7]);arrRest.push(shiftArr[0][8]);arrRest.push(shiftArr[0][9]);arrRest.push(shiftArr[0][10]);arrRest.push(shiftArr[0][11]);arrRest.push(shiftArr[0][12]);arrRest.push(shiftArr[0][6]);
	duration = parseInt(shiftArr[0][2]);
	restDay = parseInt(shiftArr[0][4]);
	holiday = (parseInt("{!R177060.R93676407#id}") > 0) ? 1 : 0;
	holType = (parseInt("{!R177060.R93676407#id}") > 0) ? "{!R177060.holiday_type#value}" : "";

	//get exclusive break
	var breakCB = [shiftArr[0][14],shiftArr[0][15],shiftArr[0][16]], breakTime = [shiftArr[0][17],shiftArr[0][18],shiftArr[0][19]], exBreak = 0;
	for(var t=0; t<3; t++){
		if(breakCB[t] == 1){
			exBreak += parseInt(breakTime[t]);
		}
	}
	exBreak *= 60000;
	
	if(shiftArr.length > 0){
		//get employee shift dates
		shiftStart = new Date("{!R177060.attendance_date}"); shiftStart.setMilliseconds(shiftArr[0][0]);
		shiftEnd   = new Date("{!R177060.attendance_date}"); shiftEnd.setMilliseconds(shiftArr[0][1]);
		if(shiftStart > shiftEnd) shiftEnd = new Date(shiftEnd.setDate(shiftEnd.getDate()+1));
		
		//get timesheet dates
		tsIn  = new Date("{!R177060.attendance_date}"); tsIn.setMilliseconds(fStartTime);
		tsOut = new Date("{!R177060.attendance_date}"); tsOut.setMilliseconds(fEndTime);
		if(tsIn > tsOut){ tsOut = new Date(tsOut.setDate(tsOut.getDate()+1)); dayOverlap = true; }
		
		//get ot dates
		otIn = new Date(new Date("{!overtime_date_from}").setHours(0,0,0,0)); otIn.setMilliseconds(parseInt("{!time_started}"));
		otOut = new Date(new Date("{!overtime_date_to}").setHours(0,0,0,0)); otOut.setMilliseconds(parseInt("{!time_ended}"));
		
		//get 10PM 6AM night shift time
		nightIn   = new Date( new Date(tsIn).setHours(0,0,0,0));  nightIn.setMilliseconds(79200000);
		nightOut  = new Date( new Date(tsOut).setHours(0,0,0,0)); nightOut.setMilliseconds(21600000);
		nightOut2 = new Date( new Date(tsIn).setHours(0,0,0,0)); nightOut2.setMilliseconds(21600000);
		
		if(!dayOverlap){
			nightOut = new Date(nightOut.setDate(nightOut.getDate()+1));
		}
		
		if(fStartTime != null && fStartTime != "" && fEndTime != null && fEndTime != ""){
			//get late hours
			if(tsIn > shiftStart && restDay == 0){
				hoursLate = tsIn - shiftStart;
			}
			
			//get deficit hours
			if(tsOut < shiftEnd && restDay == 0){
				hoursDeficit = shiftEnd - tsOut;
				hoursDeficit = hoursDeficit - hoursLate;
			}
			
			if(true){
				//get working hours
				hoursWorked = tsOut - tsIn; 
				hoursWorked -= exBreak;
				
				tsIn  = (otIn > tsIn) ? otIn : tsIn;
				tsOut = (otOut < tsOut) ? otOut :tsOut;
				
				if(hoursWorked > duration){
					tsOut2 = tsOut;
					for(var j=0; j<2; j++){
						var otFlag = false, nightHours=0;
						
						if(tsIn < shiftStart && tsOut >= shiftStart && j == 0){
							tsIn = tsIn;
							tsOut = shiftStart;
							otFlag = true;
						}
						else if(tsOut2 > shiftEnd && tsIn <= shiftEnd && j == 1){
							tsIn = shiftEnd;
							tsOut = tsOut2;
							otFlag = true;
						}
						
						if(otFlag){
							
							if((tsIn < nightIn && tsOut > nightOut) && dayOverlap == true){ nightHours = nightOut - nightIn; }
							else if(tsIn >= nightIn && tsOut <= nightOut){ nightHours = tsOut - tsIn; }
							else if(tsIn >= nightIn && tsOut > nightOut){ nightHours = nightOut - tsIn; }
							else if(tsIn < nightIn && tsOut <= nightOut && dayOverlap == true){ nightHours = tsOut - nightIn; }
							else if(tsIn < nightIn && tsOut <= nightOut && tsOut >= nightIn){ nightHours = tsOut - nightIn; }
							else if(tsIn < nightOut2 && tsOut <= nightOut2){ nightHours = tsOut - tsIn; }
							else if(tsIn < nightOut2 && tsOut > nightOut2){ nightHours = nightOut2 - tsIn; }
							
							//get normal hours
							normalHours = tsOut - tsIn;
							nightHours = (nightHours > 0) ? nightHours : 0;
							normalHours -= nightHours;
							computeOT += normalHours;
							computeOTNight += nightHours;
						}
					}
					
					totalOT = computeOT + computeOTNight;
					totalOT -= hoursLate;
					totalOT -= hoursDeficit;
					totalOT = (totalOT < 0) ? 0 : totalOT;
					
					if(computeOT >= hoursLate || computeOT >= hoursDeficit){
						computeOT -= hoursLate;
						computeOT -= hoursDeficit;
					}
					else if(computeOTNight >= hoursLate || computeOTNight >= hoursDeficit){
						computeOTNight -= hoursLate;
						computeOTNight -= hoursDeficit;
					}
					
					checkDayType(computeOT, computeOTNight);
				}
			}
		}
		
		var benCodeArr = new Array("[B_OTNORM]","[B_OTREST]","[B_OTSPCL]","[B_OTSPCL1]","[B_OTHOLD]","[B_OTHOLD1]","[B_NDOTNORMAL]","[B_OTNDREST]","[B_NDOTSPCL]","[B_NDOTRESTSPCL]","[B_NDOTREGHOLD]","[B_NDOTRESTONHOLD]");
		var loopHours = new Array(nrm, rest, spe, restspe, reg, restreg, nrm1, rest1, spe1, restspe1, reg1, restreg1);
		
		for(var i=0;i<loopHours.length;i++){
			if(loopHours[i] <= 0) {
				loopHours[i] = 0;
			}
			else{
				setToSpecificHours(loopHours[i], benCodeArr[i]);
			}
		}
	}
} getDuration();

function checkday(alDate){
	for(var i =0; i < 7; i++){      
		if( parseInt(alDate.getDay()) == i ){
			currentDay = i;
			ALday = arrDay[i];
			break;
		}  
	}
}

function setToSpecificHours(hour,ben){
	var benRec = rbv_api.selectQuery("SELECT amount, id, name, previous_amount FROM employee_benefit1 WHERE R75490940=? AND benefit_code_txt= ? AND (is_payroll_detail IS NULL OR is_payroll_detail=0)", 1, parseInt("{!R70850200#id}"),ben);
	
	if(benRec.length > 0){
		var sD = new Date(new Date("{!R61115269.period_start_date}").setHours(0,0,0,0));
		var eD = new Date(new Date("{!R61115269.period_end_date}").setHours(0,0,0,0));
		
		var total = 0;
		var amt = parseFloat(benRec[0][0])/60;
		var prevAmt = parseFloat(benRec[0][3])/60;  
		var id = parseInt(benRec[0][1]);
		var pdId = parseInt("{!R61115269.id}");
		
		var nameTemp = humanHours(hour);
		var min = convertToMin(hour);
		
		var basicId = rbv_api.selectNumber("SELECT id FROM employee_benefit1 WHERE R75490940=? AND benefit_code_txt=? AND (is_payroll_detail IS NULL OR is_payroll_detail=0)",parseInt('{!R70850200#id}'),"[B_BS]");
		var SalaryAdjRec = rbv_api.selectQuery("SELECT effectivity_date FROM salary_adjustments WHERE R123446066=? AND (effectivity_date BETWEEN ? AND ?) AND id=?",1,parseInt('{!R70850200#id}'), sD, eD,parseInt(basicId));
		
		if(SalaryAdjRec.length > 0){
			var effDate =  new Date(arrSalAdj[i][0]); effDate.setHours(0,0,0,0);
			if (workDate < effDate){
				total = prevAmt * min;
			} 
			else {
				total = amt * min;
			}
		}
		else {
			total = amt * min;
		}
		
		rbv_api.println("pd_id =233580 | pd_out ="+pdId+" "+id+" "+ben+" "+nameTemp+" "+total);
		rbv_api.setFieldValue("employee_benefit1", id, "attendance_log_date", workDate);
		rbv_api.setFieldValue("employee_benefit1", id, "R77552333", pdId); 
		rbv_api.setFieldValue("employee_benefit1", id, "__of_hours_t", nameTemp);
		rbv_api.setFieldValue("employee_benefit1", id, "amount_temp", total);
		rbv_api.runTrigger("employee_benefit1", id, "^compBen_PROC");
	}
}

function checkDayType(normal,night){
	var flag_reg=0, flag_spec=0, flag_rest=0, flag_norm=0, flag_restspe=0, flag_restreg=0;
	
	flag_rest = (restDay == 1) ? 1 : 0;
	flag_reg  = (holiday == 1 && holType == "REG") ? 1 : 0;
	flag_spec = (holiday == 1 && holType == "SPE") ? 1 : 0;
	
	if(flag_rest > 0 && flag_reg > 0 ){flag_restreg = 1;flag_rest = 0;flag_reg = 0;}
	if(flag_rest > 0 && flag_spec > 0 ){flag_restspe = 1;flag_rest = 0;flag_spec = 0;}
	flag_norm = (flag_reg <= 0 && flag_spec <= 0 && flag_rest <= 0 && flag_restreg <=0 && flag_restspe <=0) ? 1 : 0;
	
	if(flag_reg > 0){ reg+=normal; reg1+=night;}
	if(flag_spec > 0){ spe+=normal; spe1+=night;}
	if(flag_rest > 0){ rest+=normal; rest1+=night;}
	if(flag_restreg > 0){ restreg+=normal; restreg1+=night;}
	if(flag_restspe > 0){ restspe+=normal; restspe1+=night;}
	if(flag_norm > 0){ nrm+=normal; nrm1+=night;}
}

function humanHours(in_milliseconds){
	var hours = (in_milliseconds/(1000*60*60));	
	hours = hours.toString();
	if(hours.indexOf(".") != -1) hours = hours.substring(0,hours.indexOf("."));
	if(hours.length == 1) hours = "0" + hours;
			
	var minutes = (in_milliseconds/(1000*60))%60;
	minutes = minutes.toString();
	if(minutes.indexOf(".") != -1) minutes = minutes.substring(minutes.indexOf("."));
	if(minutes.length == 1) minutes = "0" +minutes;
	
	return hours + ":" +minutes;
}

function convertToMin(inMilliseconds){
	return parseFloat(inMilliseconds) / (1000*60);
}