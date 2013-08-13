{
	stringified: "Yo + 1/[1/(k*[x-Xo])+1/Ymax]",
	func: function (xVector, P) {
		//Yo + 1/[1/(k*[x-Xo])+1/Ymax]   P[0]=k, P[1]= Xo, p[2] = Ymax
		//if (xVector[0] < P[1]) {return Infinity; }
		return (1 / (1 / (P[0] * (xVector[0] - P[1])) + 1 / P[2]));
		//return params[0]+1/(1/(params[1]*(xVector[0]-params[2]))+1/params[3]);
	},
	description: 'For fitting postwash data'
}