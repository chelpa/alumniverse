import java.util.Scanner;


public class arrays {
  public static void main(String[] args) {
    int n=2;
    int comb=(int) Math.pow(2,n);

    String matriz[][];
    String var="";
    matriz = new String[n][m];
    for(int i=0;i<n;i++){
      for(int j=0;j<comb;j++){
        var=matriz[i][j];
        System.out.println(var);
      }
    }
  }
}
