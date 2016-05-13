{
	stringified: "1/[1/(vi*[x-Xo])+1/Ymax]",
	func: function (xVector, P) {
		//X must be represented as a vector ( [[1,2,4, ...], [2, ....], ... ])
		// in order to be fit using fmincon, initial conditions are determined 
		// this way below for consistancy.

		//Yo + 1/[1/(k*[x-Xo])+1/Ymax]   P[0]=k, P[1]= Xo, p[2] = Ymax
		//if (xVector[0] < P[1]) {return Infinity; }
		return (1 / (1 / (P[0] * (xVector[0] - P[1])) + 1 / P[2]));
		//return params[0]+1/(1/(params[1]*(xVector[0]-params[2]))+1/params[3]);
	},        
	setInitial: function (x_vector, y_values) {
		var vi, Ym, c, xS, xMin, xMax, yMin, yMax, y0, x_values =[], yN, slope;

		x_vector.map(function (x) { x_values.push(x[0]); });
		xS = JSON.parse(JSON.stringify(x_values));
                xS = xS.sort();
                xMin = xS.shift();
                xMax = xS.pop();
                y0 = y_values[x_values.indexOf(xMin)];
                yN = y_values[x_values.indexOf(xMax)];
                yMin = Math.min.apply(null, y_values);
                yMax = Math.max.apply(null, y_values);

                //Deal with overall negative slopes
                slope = (yN - y0) / (xMax - xMin);
                if (slope < 0) {
                        //2.7 is determined from testing
                        Ym = yMin * 2.7;
                } else {
                        //2.7 is determined from testing
                        Ym = yMax * 2.7;
                }

                //Assign parameters
                vi = Ym / 120; 
                        // This is determined via testing
                vi = vi === 0 ? -10 : vi;
                vi = vi > 80 ? 80 : vi; 
                        // This is determined via testing, >80 tend to diverge
                vi = vi < -80 ? -80 : vi;
                Ym = Ym === 0 ? -10 : Ym;
                // y0 = Ym === y0 ? Ym - 1 : y0;
                // c = Ym * y0 / (vi * (y0 - Ym)) + xMin;
                xMin = xMin || 10;
                c = 31; 
                        //Determined by looking at the distribution of 
                        // this value in well fit results.
                return [vi, c, Ym];
	},
	description: 'For fitting postwash data',
        mathType: "y(c)={y_{max}·v_{i}·(c-c_0)}/{y_{max}+v_{i}·(c-c_0)}",
        mathParams: ['v_i', 'c_0', 'y_{max}']
}