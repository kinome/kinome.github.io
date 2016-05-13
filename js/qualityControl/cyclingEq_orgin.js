{
	stringified: "y0+ymax(1-e^(-c*x))",
	func: function (xVector, P) {
		//X must be represented as a vector ( [[1,2,4, ...], [2, ....], ... ])
		// in order to be fit using fmincon, initial conditions are determined 
		// this way below for consistancy.

		//Yo + 1/[1/(k*[x-Xo])+1/Ymax]   P[0]=k, P[1]= Xo, p[2] = Ymax
		//if (xVector[0] < P[1]) {return Infinity; }

		// return (P[0] + P[1] * (1 - Math.pow(Math.E, -1 * P[2] * (xVector[0]-31))));

        return (P[0] + P[1] * (1 - Math.pow(Math.E, -1 * P[2] * (xVector[0]))));

		// return (1 / (1 / (P[0] * (xVector[0] - P[1])) + 1 / P[2]));
		//return params[0]+1/(1/(params[1]*(xVector[0]-params[2]))+1/params[3]);
	},
	setInitial: function (x_vector, y_values) {
		var vi, Ym, c, xS, xMin, xMax, yMin, yMax, y0, x_values =[], yN, exp, slope;

		x_vector.map(function (x) { x_values.push(x[0]); });
		xS = JSON.parse(JSON.stringify(x_values));
        xS = xS.sort();
        xMin = xS.shift();
        xMax = xS.pop();
        y0 = y_values[x_values.indexOf(xMin)];
        yN = y_values[x_values.indexOf(xMax)];
        yMin = Math.min.apply(null, y_values);
        yMax = Math.max.apply(null, y_values);
		slope = (yN - y0) / (xMax - xMin);

        //Deal with overall negative slopes
        Ym = (slope < 0) ? yMin : yMax;
        // Ym *= 100;
            //Determined from testing
		c = (slope < 0) ? -0.02 : 0.02;

        //Assign parameters
		// exp = 1 - (y_values[1] - y0) / Ym;
		// if (!exp || exp === 1 || exp > 1e12 || x_values[1] === 0) {
		// 	c = .05;
		// } else {
		// 	c = -1 * Math.log(exp) / x_values[1];
		// }
        return [y0, Ym, c];
	},
	description: 'For fitting postwash data',
	mathType: "y(c)=y_0+y_{max}(1-e^{-c*x})",
	mathParams: ['y_0', 'y_{max}', 'k']
}