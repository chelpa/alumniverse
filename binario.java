import java.util.Scanner;

public class main{
  public static void main(String[] args){
    //Pedimos datos al usuario
    Scanner scanner = new Scanner(System.in);
    System.out.println("Ingrese un numero: ");
    int n = scanner.nextInt();
    matriz(n);

  }

  public static void matriz(int n){
    String cadena="";
    String matriz_nxm[][];//creamos nuestra matriz
    int comb = (int) Math.pow(2,n);//cantidad de posibles combinaciones
    matriz_nxm = new String[n][comb]; //tamaño matriz
    if(n==2){
      String array[][] = {{"0","1"},{"0","0"}};
    }
    for(int i=0;i<array.length();i++){
      for(int j=0;j<array[i].length();j++){
        String var=array[i][j];
        System.out.println(var);
      }
    }

  }
}
