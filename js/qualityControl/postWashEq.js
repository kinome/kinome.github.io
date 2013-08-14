{
	stringified: "Y = mx+b",
	func: function (xVector, params) {
		//X must be represented as a vector ( [[1,2,4, ...], [2, ....], ... ])
		// in order to be fit using fmincon, initial conditions are determined 
		// this way below for consistancy.
		//Y = mx+b, params[0]=m, parmas[1]=b
		return params[0] * xVector[0] + params[1];
	},
	setInitial: function (x_vector, y_values) {
		var xMin, yMin, x_values = [];
		x_vector.map(function (x) { x_values.push(x[0]); });
		xMin = Math.min.apply(null, x_values);
        yMin = Math.min.apply(null, y_values);
        yMin = yMin === 0 ? 10 : yMin;
        xMin = xMin === 0 ? 10 : xMin;
        return [yMin / xMin, xMin];
	},
	description: 'For fitting postwash data'
}