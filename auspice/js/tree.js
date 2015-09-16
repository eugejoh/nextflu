console.log('Enter tree.js');

var freqScale = d3.scale.linear()
	.domain([0, 1])
	.range([2, 4.5]);

var tipRadius = 4.0;
var left_margin = 10;
var bottom_margin = 10;
var top_margin = 10;
if ((typeof branch_labels != "undefined")&&(branch_labels)) {top_margin +=15;}
var right_margin = 10;

function initDateColorDomain(intAttributes){
	var numDateValues = tips.map(function(d) {return d.num_date;})
	var minDate = d3.min(numDateValues.filter(function (d){return d!="undefined";}));
	var maxDate = d3.max(numDateValues.filter(function (d){return d!="undefined";}));	
	if (typeof time_window == "undefined"){
		time_window = maxDate-minDate;
		console.log("defining time window as " + time_window);
	} 
	if (time_window>1){
		dateColorDomain = genericDomain.map(function (d){return Math.round(10*(maxDate - (1.0-d)*time_window))/10;});
	}else{
		dateColorDomain = genericDomain.map(function (d){return Math.round(100*(maxDate - (1.0-d)*time_window))/100;});		
	}
	console.log('setting date domain '+dateColorDomain);
	dateColorScale.domain(dateColorDomain);
}


function initColorDomain(attr, tmpCS){
	//var vals = tips.filter(function(d) {return tipVisibility(d)=='visible';}).map(function(d) {return d[attr];});
	var vals = tips.map(function(d) {return d[attr];});
	var minval = d3.min(vals);
	var maxval = d3.max(vals);	
	var rangeIndex = Math.min(10, maxval - minval + 1);
	var domain = [];
	if (maxval-minval<20)
	{
		for (var i=maxval - rangeIndex + 1; i<=maxval; i+=1){domain.push(i);}
	}else{
		for (var i=1.0*minval; i<=maxval; i+=(maxval-minval)/9.0){domain.push(i);}		
	}
	tmpCS.range(colors[rangeIndex]);
	tmpCS.domain(domain);
}

function updateColorDomains(num_date){
	dateColorDomain = genericDomain.map(function(d) {return Math.round(10*(num_date - time_window*(1.0-d)))/10;});
	dateColorScale.domain(dateColorDomain);
}

function tipVisibility(d) {
	if ((d.diff < 0 || d.diff > time_window)&(date_select==true)) {
		return "hidden";
	}
	else if (d.region != restrictTo && restrictTo != "all") {
		return "hidden";
	}
	else if (d.lab != restrictToLab && restrictToLab != "all") {
		return "hidden";
	}
	else {
		return "visible";
	}
}

function branchPoints(d) {
	var mod = 0.5 * freqScale(d.target.frequency) - freqScale(0);
	return (d.source.x-mod).toString() + "," + d.source.y.toString() + " "
		+ (d.source.x-mod).toString() + "," + d.target.y.toString() + " "
		+ (d.target.x).toString() + "," + d.target.y.toString();
}

function branchStrokeWidth(d) {
	return freqScale(d.target.frequency);
}

function branchLabelText(d) {
	var tmp_str=''
	if (typeof d.aa_muts != "undefined"){
		tmp_str = d.aa_muts.replace(/,/g, ', '); 
	}else{
		tmp_str = d.nuc_muts.replace(/,/g, ', '); 		
	}
	if (tmp_str.length>50){
		return tmp_str.substring(0,45)+'...';
	}
	else {
		return tmp_str;
	}
}

function tipLabelText(d) {
	if (d.strain.length>32){
		return d.strain.substring(0,30)+'...';
	}
	else {
		return d.strain;
	}
}

function branchLabelSize(d) {
	var n = nDisplayTips;
	if (d.fullTipCount>n/15) {
		return "12px";
	}
	else {
		return "0px";
	}
}

function tipLabelSize(d) {
	if (tipVisibility(d)!="visible"){
		return 0;
	}
	var n = nDisplayTips;
	if (n<25){
		return 16;
	}else if (n<50){
		return 12;
	}else if (n<75){
		return 8;
	}
	else {
		return 0;
	}
}

function tipLabelWidth(d) {
	return tipLabelText(d).length * tipLabelSize(d) * 0.5;
}

function strainToID(d){
	return ('id'+d.strain).replace(/\//g, "").replace('.','');	
}

function tree_init(){
	calcFullTipCounts(rootNode);
	calcAllRegions(rootNode);
	calcBranchLength(rootNode);
	rootNode.branch_length= 0.01;	
	rootNode.dfreq = 0.0;
	if (typeof rootNode.pivots != "undefined"){
		time_step = rootNode.pivots[1]-rootNode.pivots[0];		
	}else{
		time_step = 1.0/12;
	}
	//setting index of frequency trajectory to use for calculating frequency change
	freq_ii = 1;
	if (typeof rootNode.pivots != "undefined") {
		if (typeof rootNode.pivots.length != "undefined") {
			freq_ii = rootNode.pivots.length - 1;
		}
	}
	calcNodeAges(LBItime_window);
	colorByTrait();
	adjust_freq_by_date();
	tree_legend = makeLegend();
	nDisplayTips = displayRoot.fullTipCount;	
}

d3.json(path + file_prefix + "tree.json", function(error, root) {

	if (error) return console.warn(error);

	nodes = tree.nodes(root);
	links = tree.links(nodes);
	var tree_legend;
	rootNode = nodes[0];
	displayRoot = rootNode;
	tips = gatherTips(rootNode, []);
	vaccines = getVaccines(tips);

	initDateColorDomain();
	if (typeof rootNode['ep'] != "undefined"){ initColorDomain('ep', epitopeColorScale);}
	if (typeof rootNode['ne'] != "undefined"){ initColorDomain('ne', nonepitopeColorScale);}
	if (typeof rootNode['rb'] != "undefined"){ initColorDomain('rb', receptorBindingColorScale);}
	date_init();
	tree_init();

	var xValues = nodes.map(function(d) {
		return +d.xvalue;
	});

	var yValues = nodes.map(function(d) {
		return +d.yvalue;
	});

	if ((typeof tip_labels != "undefined")&&(tip_labels)){
		var maxTextWidth = 0;
		var labels = treeplot.selectAll(".tipLabel")
			.data(tips)
			.enter()
			.append("text")
			.attr("class","tipLabel")
			.style("font-size", function(d) { return tipLabelSize(d)+"px"; })		
			.text(tipLabelText)
			.each(function(d) {
				var textWidth = tipLabelWidth(d);
				if (textWidth>maxTextWidth) {
					maxTextWidth = textWidth;
				}
			});
		right_margin = maxTextWidth + 10;
	}

	var xScale = d3.scale.linear()
		.domain([d3.min(xValues), d3.max(xValues)])
		.range([left_margin, treeWidth - right_margin]);

	var yScale = d3.scale.linear()
		.domain([d3.min(yValues), d3.max(yValues)])
		.range([top_margin, treeHeight - bottom_margin]);
	console.log(treeHeight +" " + top_margin);

	nodes.forEach(function (d) {
		d.x = xScale(d.xvalue);
		d.y = yScale(d.yvalue);
	});

	var clade_freq_event;
	var link = treeplot.selectAll(".link")
		.data(links)
		.enter().append("polyline")
		.attr("class", "link")
		.attr("points", branchPoints)
		.style("stroke-width", branchStrokeWidth)
		.style("stroke", branchStrokeColor)		
		.style("cursor", "pointer")
		.on('mouseover', function (d){
			linkTooltip.show(d.target, this);
			if ((colorBy!="genotype")&(typeof addClade !="undefined")){
				clade_freq_event = setTimeout(addClade, 1000, d);
			}
			if (colorBy=='region'){
				legend.selectAll('.map_feature')
					.filter(function (m) { return patch_in_list(m, d);})
					.style("fill", function (m){return d3.rgb(patch_color(m)).brighter();});
				}
			})
		.on('mouseout', function(d) {
			linkTooltip.hide(d);
			if (typeof addClade !="undefined") {clearTimeout(clade_freq_event);};
			if (colorBy=='region'){
				legend.selectAll('.map_feature')
					.filter(function (m) { return patch_in_list(m, d);})
					.style("fill", function (m){return d3.rgb(patch_color(m));});
				}
		})		
		.on('click', function(d) {
			if ((colorBy!="genotype")&(typeof addClade !="undefined")){
				addClade(d);
			}
			var dy = yScale.domain()[1]-yScale.domain()[0];
			displayRoot = d.target;
			var dMin = 0.5 * (minimumAttribute(d.target, "xvalue", d.target.xvalue) + minimumAttribute(d.source, "xvalue", d.source.xvalue)),
				dMax = maximumAttribute(d.target, "xvalue", d.target.xvalue),
				lMin = minimumAttribute(d.target, "yvalue", d.target.yvalue),
				lMax = maximumAttribute(d.target, "yvalue", d.target.yvalue);
			if (dMax == dMin || lMax == lMin) {
				displayRoot = d.source;
				dMin = minimumAttribute(d.source, "xvalue", d.source.xvalue),
				dMax = maximumAttribute(d.source, "xvalue", d.source.xvalue),
				lMin = minimumAttribute(d.source, "yvalue", d.source.yvalue),
				lMax = maximumAttribute(d.source, "yvalue", d.source.yvalue);			
			}
			if ((lMax-lMin)>0.999*dy){
				lMin = lMax - dy*0.7 
			}
			var visibleXvals = tips.filter(function (d){return (d.yvalue>=lMin)&&(d.yvalue<lMax)}).map(function(d){return +d.xvalue;});
			nDisplayTips = visibleXvals.length;
			dMax = Math.max.apply(Math, visibleXvals);
			console.log("nodes in view: "+nDisplayTips+' max Xval: '+dMax);
			rescale(dMin, dMax, lMin, lMax);
		});

	if ((typeof branch_labels != "undefined")&&(branch_labels)){
		var mutations = treeplot.selectAll(".branchLabel")
			.data(nodes)
			.enter()
			.append("text")
			.attr("class", "branchLabel")
			.style("font-size", branchLabelSize)			
			.attr("x", function(d) {
				return d.x - 6;
			})
			.attr("y", function(d) {
				return d.y - 3;
			})
			.style("text-anchor", "end")
			.text(branchLabelText);
		}

	if ((typeof tip_labels != "undefined")&&(tip_labels)){
		treeplot.selectAll(".tipLabel").data(tips)
			.style("font-size", function(d) { return tipLabelSize(d)+"px"; })			
			.attr("x", function(d) { return d.x+10; })
			.attr("y", function(d) { return d.y+4; });			
	}

	var tipCircles = treeplot.selectAll(".tip")
		.data(tips)
		.enter()
		.append("circle")
		.attr("class", "tip")
		.attr("id", strainToID)
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.attr("r", tipRadius)
		.style("visibility", tipVisibility)
		.style("fill", tipFillColor)
		.style("stroke", tipStrokeColor)
		.on('mouseover', function(d) {
			virusTooltip.show(d, this);
			if (colorBy=='region'){
				legend.selectAll('.map_feature')
					.filter(function (m) { return match_region(m, d);})
					.style("fill", function(m) {
						return d3.rgb(colorScale(d.coloring)).brighter();});
			}
		})
		.on('click', function(d) {
			if ((typeof d.db != "undefined") && (d.db == "GISAID") && (typeof d.accession != "undefined")) {
				var url = "http://gisaid.org/EPI/"+d.accession;
				console.log("opening url "+url);
				var win = window.open(url, '_blank');
  				win.focus();
  			}	
  		})		
		.on('mouseout', function(d) {
			virusTooltip.hide(d, this);
			if (colorBy=='region'){
				legend.selectAll('.map_feature')
					.filter(function (m) { return match_region(m, d);})
					.style("fill", function (){return colorScale(d.coloring);});
			}
		})

	var vaccineCircles = treeplot.selectAll(".vaccine")
		.data(vaccines)
		.enter()
		.append("text")
		.attr("class", "vaccine")
		.attr("x", function(d) {return d.x})
		.attr("y", function(d) {return d.y})
		.attr('text-anchor', 'middle')
		.attr('dominant-baseline', 'central')
		.style("font-size", "28px")
		.style('font-family', 'FontAwesome')
		.style("fill", "#555555")
		.text(function(d) { return '\uf00d'; })
		.style("cursor", "default")
		.on('mouseover', function(d) {
			virusTooltip.show(d, this);
		})
		.on('mouseout', virusTooltip.hide);


	d3.select("#reset")
		.on("click", function(d) {
			displayRoot = rootNode;
			nDisplayTips = displayRoot.fullTipCount;
			var dMin = d3.min(xValues),
				dMax = d3.max(xValues),
				lMin = d3.min(yValues),
				lMax = d3.max(yValues);
			rescale(dMin, dMax, lMin, lMax);
			removeClade();
		})

	function rescale(dMin, dMax, lMin, lMax) {

		var speed = 1500;
		
		if ((typeof tip_labels != "undefined")&&(tip_labels)){
			var maxTextWidth = 0;
			var labels = treeplot.selectAll(".tipLabel")
				.data(tips)
				.each(function(d) {
					var textWidth = tipLabelWidth(d);
					if (textWidth>maxTextWidth) {
						maxTextWidth = textWidth;
					}
				});
			right_margin = maxTextWidth + 10;
			xScale.range([left_margin, treeWidth - right_margin]);
		}		
		
		xScale.domain([dMin,dMax]);
		yScale.domain([lMin,lMax]);

		nodes.forEach(function (d) {
			d.x = xScale(d.xvalue);
			d.y = yScale(d.yvalue);
		});

		treeplot.selectAll(".tip").data(tips)
			.transition().duration(speed)
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });

		treeplot.selectAll(".vaccine").data(vaccines)
			.transition().duration(speed)
			.attr("x", function(d) { return d.x; })
			.attr("y", function(d) { return d.y; });

		treeplot.selectAll(".link").data(links)
			.transition().duration(speed)
			.attr("points", branchPoints);

		if ((typeof tip_labels != "undefined")&&(tip_labels)){
			treeplot.selectAll(".tipLabel").data(tips)
				.transition().duration(speed)
				.style("font-size", function(d) {return tipLabelSize(d)+"px"; })			
				.attr("x", function(d) { return d.x+10; })
				.attr("y", function(d) { return d.y+4; });
		}	
			
		if ((typeof branch_labels != "undefined")&&(branch_labels)){
			console.log('shift branch_labels');
			treeplot.selectAll(".branchLabel").data(nodes)
				.transition().duration(speed)
				.style("font-size", branchLabelSize)				
				.attr("x", function(d) {  return d.x - 6;})
				.attr("y", function(d) {  return d.y - 3;});
		}

		if (typeof clades !="undefined"){
			treeplot.selectAll(".annotation").data(clades)
				.transition().duration(speed)
				.attr("x", function(d) {
					return xScale(d[1]) - 6;
				})
				.attr("y", function(d) {
					return yScale(d[2]) - 6;
				});			
		}
	}

	d3.select(window).on('resize', resize); 
	
	function resize() {
	
		containerWidth = parseInt(d3.select(".treeplot-container").style("width"), 10);
		treeWidth = containerWidth;
		treeHeight = treePlotHeight(treeWidth);
			
		d3.select("#treeplot")
			.attr("width", treeWidth)
			.attr("height", treeHeight);

		if ((typeof tip_labels != "undefined")&&(tip_labels)){
			var maxTextWidth = 0;
			var labels = treeplot.selectAll(".tipLabel")
				.data(tips)
				.each(function(d) {
					var textWidth = tipLabelWidth(d);
					if (textWidth>maxTextWidth) {
						maxTextWidth = textWidth;
					}
				});
			right_margin = maxTextWidth + 10;
		}	
			
		xScale.range([left_margin, treeWidth - right_margin]);
		yScale.range([top_margin, treeHeight - bottom_margin]);
		
		nodes.forEach(function (d) {
			d.x = xScale(d.xvalue);
			d.y = yScale(d.yvalue);
		});		
		
		treeplot.selectAll(".tip").data(tips)
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });

		treeplot.selectAll(".vaccine").data(vaccines)
			.attr("x", function(d) { return d.x; })
			.attr("y", function(d) { return d.y; });
			
		treeplot.selectAll(".link").data(links)
			.attr("points", branchPoints);
			
		if ((typeof tip_labels != "undefined")&&(tip_labels))
		{
			treeplot.selectAll(".tipLabel").data(tips)
				.style("font-size", function(d) { return tipLabelSize(d)+"px"; })
				.attr("x", function(d) { return d.x+10; })
				.attr("y", function(d) { return d.y+4; });
		}

		if ((typeof branch_labels != "undefined")&&(branch_labels))
		{
			console.log('shift branch_labels');
			treeplot.selectAll(".branchLabel").data(nodes)
				.style("font-size", branchLabelSize)			
				.attr("x", function(d) {  return d.x - 6;})
				.attr("y", function(d) {  return d.y - 3;});
		}

		if (typeof clades !="undefined")
		{
			treeplot.selectAll(".annotation").data(clades)
				.attr("x", function(d) {
					return xScale(d[1]) - 6;
				})
				.attr("y", function(d) {
					return yScale(d[2]) - 6;
				});
		}
	}
	
	var tmp = document.getElementById("region");
	if (tmp!=null){
		restrictTo = tmp.value;
	}else{restrictTo='all';}
	function restrictToRegion() {
		restrictTo = document.getElementById("region").value;
		console.log(restrictTo);	
		d3.selectAll(".tip")
			.style("visibility", tipVisibility);
	}

	var tmp = document.getElementById("lab");
	if (tmp!=null){
		restrictToLab = tmp.value;
	}else{restrictToLab='all';}
	function restrictToLabFunc() {
		restrictToLab = document.getElementById("lab").value;
		console.log(restrictToLab);	
		d3.selectAll(".tip")
			.style("visibility", tipVisibility);
	}


	d3.select("#region")
		.style("cursor", "pointer")
		.on("change", restrictToRegion);		
	d3.select("#lab")
		.style("cursor", "pointer")
		.on("change", restrictToLabFunc);		

	var searchEvent;
	function onSelect(tip) {
		d3.select("#"+strainToID(tip))
			.call(function(d) {
				console.log('found strain '+tip.strain);
				virusTooltip.show(tip, d[0][0]);
			})
            .attr("r", function(d){return tipRadius*1.7;})
            .style("fill", function (d) {
              searchEvent = setTimeout(function (){
              	d3.select("#"+strainToID(tip))
              	 .attr("r", function(d){return tipRadius;})
              	 .style("fill", tipFillColor);}, 5000, d);
              return d3.rgb(tipFillColor(d)).brighter();
            });
	}

	var mc = autocomplete(document.getElementById('search'))
		.keys(tips)
		.dataField("strain")
		.placeHolder("search strains...")
		.width(800)
		.height(500)
		.onSelected(onSelect)
		.render();


	// add clade labels
	clades = rootNode["clade_annotations"];
	if (typeof clades != "undefined"){
		console.log(clades);
		var clade_annotations = treeplot.selectAll('.annotation')
			.data(clades)
			.enter()
			.append("text")
			.attr("class", "annotation")
			.attr("x", function(d) {
				return xScale(d[1]) - 6;
			})
			.attr("y", function(d) {
				return yScale(d[2]) - 6;
			})
			.style("text-anchor", "end")
			.text(function (d) {
				return d[0];
			});
		}

});

d3.json(path + file_prefix + "sequences.json", function(error, json) {
	if (error) return console.warn(error);
	cladeToSeq=json;
});

