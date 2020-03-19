package polindromo;

import java.util.Scanner;

public class polindromo{

	public static void main(String[] args) {
		//pedimos datos a usuario
		Scanner scanner = new Scanner(System.in);
		System.out.println("Ingrese un numero: ");
		
		//usamos numero ingresado como string para poder comparar cadenas
		String numeroTxt = scanner.nextLine();
		System.out.println("Los numeros divisores políndromos son: ");
		
		//convertimos a int nuestro numero
		int num = Integer.parseInt(numeroTxt);
		//mostramos numeros divisores que son polindromos
		
		System.out.println(divisoresPoli(num));
		
	}
	
	//verificamos si numero deseado es polindromo
	public static boolean esPolindromo(String numeroTxt){
		int resto=1;
		String cadenaInv="",restoTxt="";
		//convertimos a int nuestro numero
		int num = Integer.parseInt(numeroTxt);
		//sacamos resto de numero para ir agregandolo a una nueva cadena

		while(num!=0){	
			resto=num%10;
			num=num/10;//vamos achicando la variable num 123 12 1
			restoTxt = Integer.toString(resto);
			cadenaInv+=restoTxt;//agregamos resto a cadena para mostrar numero invertido
		}

		//comparamos nuestro numero invertido con original
		if(cadenaInv.contentEquals(numeroTxt)){
			return true;
			
		}else{
			return false;
			}
	}

	//verificamos los divisores que cumplen con los requisitos de ser polindromos
	public static String divisoresPoli(int num){
		String divisorTxt,cadenaNum="1";
		int divisor=0;
		
		for(int i=2;i<num+1;i++){//buscamos los divisores
			if((num%i)==0){//si modulo es cero entonces es divisor
				divisor = i; 
				divisorTxt = Integer.toString(divisor);//convertimos a string para usar metodo esPolindromo
				if(esPolindromo(divisorTxt)==true) {
					cadenaNum+=", "+divisorTxt;	
				}
			}
		}
		return cadenaNum;
	}
}
